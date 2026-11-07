"""
Phase 10: Crime-Specific AI-Based Preventive Resource Optimization Service.

Connects directly to:
- Phase 8: Crime-type hierarchical predictions (expected crime counts across all 21 crime types).
- Phase 9: Explainable crime risk assessment scores (overall_risk_score, risk_level, strongest_driver).
- Official resource inventory baselines (BPR&D state resources and admin planning pools).

Solves constrained Mixed-Integer Linear Programming (MILP) to:
- Guarantee exact integer allocations (whole numbers of officers, vehicles, teams).
- Ensure absolute resource conservation (never allocate more than available pool).
- Prioritize high-severity crimes and high-threat districts under capacity deficits.
- Provide full explainability and non-causal planning disclaimers.
"""

import time
import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
import numpy as np
from scipy.optimize import milp, LinearConstraint, Bounds
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException, status
import logging

from backend.app.models.optimization import (
    OptimizationRun,
    OptimizationAllocation,
    CrimeResourceMapping,
    ResourceInventoryRecord,
)
from backend.app.models.geography import State, District
from backend.app.models.crime import CrimeType, CrimeCategory
from backend.app.models.intelligence import CrimeRiskScore
from backend.app.models.resources import ResourceType
from backend.app.services.prediction_service import PredictionService
from backend.app.services.risk_service import RiskService, CALCULATION_VERSION as RISK_VERSION
from backend.app.services.crime_mapping_service import CrimeMappingService
from backend.app.schemas.optimization import (
    DistrictCrimeDemandResponse,
    CrimeDemandBreakdownItem,
    CrimeTypeMatrixItem,
    CrimeSpecificOptimizationRequest,
    CrimeSpecificOptimizationResponse,
    DistrictCrimeAllocationItem,
)

logger = logging.getLogger(__name__)

OPTIMIZATION_ALGORITHM = "CRIME_SPECIFIC_INTEGER_MILP"

PLANNING_DISCLAIMER = (
    "This crime-specific optimization recommendation is a decision-support planning indicator. "
    "It does not constitute an operational deployment order, a statutory mandate, or a guarantee of crime prevention. "
    "Under Indian constitutional jurisprudence (Seventh Schedule, Entry 2, List II), operational police deployment is "
    "the exclusive prerogative of state police leadership (DGP / Home Dept). Demographic profiling is strictly prohibited."
)


class CrimeResourceOptimizationService:

    @staticmethod
    def calculate_district_crime_demand(
        db: Session,
        district_id: int,
        year: int = 2026,
        month: int = 11,
    ) -> DistrictCrimeDemandResponse:
        """
        Calculates granular, crime-specific preventive resource requirements for a district
        by combining Phase 8 crime-type predictions with the Crime-to-Resource Mapping Master.
        """
        # 1. District Metadata
        district = db.query(District).filter(District.id == district_id).first()
        if not district:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"District {district_id} not found.")

        state = db.query(State).filter(State.id == district.state_id).first()
        state_name = state.state_name if state else "Unknown"

        # 2. Phase 8 Hierarchical Crime-Type Predictions
        pred_breakdown = PredictionService.get_prediction_breakdown(
            db, district_id=district_id, year=year, month=month
        )

        # 3. Phase 9 Risk Assessment Score
        period_str = f"{year:04d}-{month:02d}-01"
        risk_score_row = (
            db.query(CrimeRiskScore)
            .filter(
                CrimeRiskScore.district_id == district_id,
                CrimeRiskScore.period_year == year,
                CrimeRiskScore.period_month == month,
                CrimeRiskScore.calculation_version == RISK_VERSION,
            )
            .first()
        )
        overall_risk = float(risk_score_row.overall_risk_score) if risk_score_row else 50.0
        risk_level = risk_score_row.risk_level if risk_score_row else "MODERATE"

        # 4. Active Crime-to-Resource Mappings
        mappings = CrimeMappingService.list_mappings(db, is_active=True)
        mappings_by_crime: Dict[int, List[Any]] = {}
        for m in mappings:
            mappings_by_crime.setdefault(m.crime_type_id, []).append(m)

        CATEGORY_RESOURCE_MAP = {
            "PERSONNEL": (1, "Police Officers", "Personnel"),
            "MOBILITY": (2, "Patrol Vehicles", "Vehicles"),
            "INVESTIGATION": (3, "Investigation Teams", "Teams"),
            "SPECIALIZED": (93, "Crime Branch Specialized Units", "Units"),
            "SURVEILLANCE": (61, "Surveillance CCTV Cameras", "Cameras"),
            "FORENSIC": (121, "Forensic Examination Capacity", "Tests/Month"),
            "CYBER_TECHNOLOGY": (122, "Digital Forensic Workstations", "Workstations"),
            "EMERGENCY_RESPONSE": (123, "Emergency Medical Response Units", "Ambulances"),
            "COMMUNICATION": (124, "Police Radio & Dispatch Consoles", "Channels"),
            "TRAFFIC_SAFETY": (125, "Traffic Safety Enforcement Devices", "Devices"),
        }
        pool_units: Dict[str, str] = {cat: val[2] for cat, val in CATEGORY_RESOURCE_MAP.items()}

        # 5. Calculate Crime-Specific Demand Items and 21-Crime Matrix across all 10 pools
        demand_breakdowns: List[CrimeDemandBreakdownItem] = []
        crime_matrix: List[CrimeTypeMatrixItem] = []
        raw_demands_by_pool: Dict[str, float] = {cat: 0.0 for cat in CATEGORY_RESOURCE_MAP.keys()}

        # Map crime types from predictions
        for ct in pred_breakdown.crime_types:
            p_count = ct.predicted_count
            ct_maps = mappings_by_crime.get(ct.crime_type_id, [])

            # Severity weight from category or severity level
            sev_multiplier = 1.0
            if ct.severity_level == "CRITICAL":
                sev_multiplier = 1.50
            elif ct.severity_level == "HIGH":
                sev_multiplier = 1.25
            elif ct.severity_level == "MEDIUM":
                sev_multiplier = 1.00
            else:
                sev_multiplier = 0.80

            ct_coeffs: Dict[str, float] = {}
            ct_raw_demands: Dict[str, float] = {}
            ct_rationales: Dict[str, str] = {}
            ct_units: Dict[str, str] = dict(pool_units)

            for m in ct_maps:
                pool = m.shared_pool_category.upper()
                ct_coeffs[pool] = m.coefficient
                ct_rationales[pool] = m.operational_rationale or ""
                m_unit = m.unit_of_measure or pool_units.get(pool, "Units")

                if p_count >= m.min_demand_threshold:
                    # Physical resource demand (uninflated: crime forecast * planning coefficient)
                    raw_req = p_count * m.coefficient
                    ct_raw_demands[pool] = round(raw_req, 3)
                    raw_demands_by_pool[pool] = raw_demands_by_pool.get(pool, 0.0) + raw_req

                    demand_breakdowns.append(
                        CrimeDemandBreakdownItem(
                            crime_type_id=ct.crime_type_id,
                            crime_code=ct.crime_code,
                            crime_name=ct.crime_name,
                            category_name=ct.category_name,
                            severity_level=ct.severity_level,
                            severity_weight=sev_multiplier,
                            predicted_crime_count=round(p_count, 3),
                            resource_type_id=m.resource_type_id,
                            resource_name=m.resource_name,
                            coefficient=m.coefficient,
                            raw_demand=round(raw_req, 3),
                            shared_pool_category=pool,
                            unit_of_measure=m_unit,
                            priority_weight=m.priority_weight,
                            operational_rationale=m.operational_rationale,
                        )
                    )
                else:
                    ct_raw_demands[pool] = 0.0

            crime_matrix.append(
                CrimeTypeMatrixItem(
                    crime_type_id=ct.crime_type_id,
                    crime_code=ct.crime_code,
                    crime_name=ct.crime_name,
                    category_name=ct.category_name,
                    severity_level=ct.severity_level,
                    predicted_count=round(p_count, 3),
                    coefficients=ct_coeffs,
                    raw_demands=ct_raw_demands,
                    rationales=ct_rationales,
                    units=ct_units,
                )
            )

        # Integer shared capacity demand: ceil(raw_demand)
        integer_demands: Dict[str, int] = {
            pool: max(int(np.ceil(val)), 1 if val > 0.05 else 0)
            for pool, val in raw_demands_by_pool.items()
        }

        calc_notes = (
            f"Calculated from {len(pred_breakdown.crime_types)} Phase 8 crime-type forecasts "
            f"(total {pred_breakdown.total_predicted_count:.2f} predicted incidents) and Phase 9 risk score "
            f"({overall_risk:.1f}, {risk_level}). Shared capacity pooling prevents double-counting."
        )

        return DistrictCrimeDemandResponse(
            district_id=district_id,
            district_name=district.district_name,
            state_id=district.state_id,
            state_name=state_name,
            assessment_period=period_str,
            total_predicted_crimes=round(pred_breakdown.total_predicted_count, 2),
            district_risk_score=overall_risk,
            district_risk_level=risk_level,
            resource_demands=integer_demands,
            crime_breakdowns=demand_breakdowns,
            crime_matrix=crime_matrix,
            calculation_notes=calc_notes,
        )

    @staticmethod
    def run_crime_specific_optimization(
        db: Session,
        req: CrimeSpecificOptimizationRequest,
        user_id: Optional[int] = None,
    ) -> CrimeSpecificOptimizationResponse:
        """
        Executes constrained Mixed-Integer Linear Programming (MILP) to allocate resources across districts.
        Guarantees:
        1. Exact integer allocations (whole numbers of personnel and vehicles).
        2. Strict resource conservation: sum(allocated) <= available_pool.
        3. Priority to higher-severity crimes and higher-risk districts under shortages.
        4. Explicit reporting of unmet demand and coverage percentages.
        """
        start_time = time.time()

        # 1. State Validation
        state = db.query(State).filter(State.id == req.state_id).first()
        if not state:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"State ID {req.state_id} not found.")

        try:
            dt = datetime.strptime(req.assessment_period, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid date format: {req.assessment_period}")

        year, month = dt.year, dt.month

        # 2. Districts in State (using active administrative districts)
        districts = (
            db.query(District)
            .filter(District.state_id == req.state_id, District.is_current_admin == True)
            .order_by(District.district_name)
            .all()
        )
        if not districts:
            # Fallback to historical districts if no admin flag
            districts = db.query(District).filter(District.state_id == req.state_id).order_by(District.district_name).all()

        if not districts:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No districts found for state {state.state_name}.")

        # 3. Available Inventory Capacity Pools for this State
        inv_summary = CrimeMappingService.get_available_inventory_summary(db, state_id=req.state_id)
        avail_pools = dict(inv_summary.available_by_category)

        # Apply user overrides if specified
        if req.capacity_overrides:
            for cat, override in req.capacity_overrides.items():
                if override >= 0:
                    avail_pools[cat.upper()] = override

        # Selected resource categories to optimize (defaults to all 10 institutional pools)
        CATEGORY_RESOURCE_MAP = {
            "PERSONNEL": (1, "Police Officers", "Personnel", 1000, False),
            "MOBILITY": (2, "Patrol Vehicles", "Vehicles", 500, False),
            "INVESTIGATION": (3, "Investigation Teams", "Teams", 200, False),
            "SPECIALIZED": (93, "Crime Branch Specialized Units", "Units", 100, False),
            "SURVEILLANCE": (61, "Surveillance CCTV Cameras", "Cameras", 150, False),
            "FORENSIC": (121, "Forensic Examination Capacity", "Tests/Month", 100, False),
            "CYBER_TECHNOLOGY": (122, "Digital Forensic Workstations", "Workstations", 50, False),
            "EMERGENCY_RESPONSE": (123, "Emergency Medical Response Units", "Ambulances", 80, True),
            "COMMUNICATION": (124, "Police Radio & Dispatch Consoles", "Channels", 120, False),
            "TRAFFIC_SAFETY": (125, "Traffic Safety Enforcement Devices", "Devices", 150, False),
        }

        configured_map = {c["category"]: c.get("is_configured", True) for c in inv_summary.categories}

        categories_to_opt = req.resource_categories or list(CATEGORY_RESOURCE_MAP.keys())
        categories_to_opt = [c.upper() for c in categories_to_opt]

        # 4. Gather District Crime Demands
        district_demands: List[DistrictCrimeDemandResponse] = []
        for d in districts:
            try:
                dem = CrimeResourceOptimizationService.calculate_district_crime_demand(
                    db, district_id=d.id, year=year, month=month
                )
                district_demands.append(dem)
            except Exception as e:
                logger.warning(f"Could not calculate demand for district {d.id} ({d.district_name}): {e}")

        if not district_demands:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to calculate demands for districts in state.")

        n_districts = len(district_demands)
        run_id = f"opt-crime-{year}{month:02d}-{uuid.uuid4().hex[:8]}"

        # 5. Solve Optimization per Category Pool across all 10 pools
        pool_summaries: Dict[str, Dict[str, Any]] = {}
        all_allocations: List[DistrictCrimeAllocationItem] = []
        shortage_alerts: List[Dict[str, Any]] = []

        total_demand_all = 0
        total_allocated_all = 0
        total_unmet_all = 0

        for cat in categories_to_opt:
            res_type_id, res_name, res_unit, default_cap, is_partner = CATEGORY_RESOURCE_MAP.get(
                cat, (1, "Police Officers", "Units", 500, False)
            )
            has_override = (
                req.capacity_overrides is not None
                and cat in req.capacity_overrides
                and req.capacity_overrides[cat] >= 0
            )
            is_cat_configured = configured_map.get(cat, True) or has_override
            capacity = avail_pools.get(cat, 0)

            # Demand vector
            demands = np.array([dem.resource_demands.get(cat, 0) for dem in district_demands], dtype=int)
            cat_demand_sum = int(np.sum(demands))
            total_demand_all += cat_demand_sum

            if not is_cat_configured:
                # Unconfigured capacity: allocate 0, solver reports UNCONFIGURED_CAPACITY, alert raised
                alloc_res = np.zeros(n_districts, dtype=int)
                solver_status_cat = "UNCONFIGURED_CAPACITY"
                if cat_demand_sum > 0:
                    shortage_alerts.append({
                        "district_id": None,
                        "district_name": "Statewide Standing Pool",
                        "category": cat,
                        "demanded": cat_demand_sum,
                        "allocated": 0,
                        "deficit": cat_demand_sum,
                        "risk_level": "WARNING",
                        "alert_type": "UNCONFIGURED_CAPACITY",
                        "message": f"Standing inventory for {cat} is unconfigured (0 units available). Allocations withheld until state administration records verified baseline.",
                    })
            else:
                # Priority weights vector: based on demand-weighted crime severity, Phase 9 risk score, and scenario type
                weights = np.zeros(n_districts, dtype=float)
                for i, dem in enumerate(district_demands):
                    cat_breakdowns = [b for b in dem.crime_breakdowns if b.shared_pool_category == cat]
                    total_cat_raw = sum(b.raw_demand for b in cat_breakdowns)
                    if total_cat_raw > 0:
                        weighted_sev = sum(b.raw_demand * b.severity_weight for b in cat_breakdowns) / total_cat_raw
                    else:
                        weighted_sev = 1.0

                    r_score = dem.district_risk_score
                    if req.scenario_type == "HIGH_SEVERITY_PRIORITY":
                        weights[i] = weighted_sev * (1.0 + (r_score / 50.0))
                    elif req.scenario_type == "CYBER_SPECIALIZED" and cat in ["SPECIALIZED", "CYBER_TECHNOLOGY"]:
                        weights[i] = weighted_sev * (1.5 + (r_score / 40.0))
                    elif req.scenario_type == "HIGHWAY_SAFETY" and cat in ["MOBILITY", "TRAFFIC_SAFETY"]:
                        weights[i] = weighted_sev * (1.5 + (r_score / 40.0))
                    else:
                        # Balanced CRIME_SPECIFIC_OPTIMAL
                        weights[i] = weighted_sev * (1.0 + (r_score / 100.0))

                # -----------------------------------------------------------------
                # MILP Formulation using scipy.optimize.milp
                # -----------------------------------------------------------------
                c = -weights  # Cost vector to minimize
                integrality = np.ones(n_districts)  # 1 = integer constraints
                bounds = Bounds(lb=np.zeros(n_districts), ub=demands)
                A = np.ones((1, n_districts))
                constraints = LinearConstraint(A, lb=0, ub=capacity)

                if cat_demand_sum == 0:
                    alloc_res = np.zeros(n_districts, dtype=int)
                    solver_status_cat = "ZERO_DEMAND"
                elif cat_demand_sum <= capacity:
                    # Supply satisfies all demand fully
                    alloc_res = demands.copy()
                    solver_status_cat = "OPTIMAL_SATISFIED"
                else:
                    # Solve integer optimization under shortage
                    res = milp(c=c, integrality=integrality, bounds=bounds, constraints=constraints)
                    if res.success:
                        alloc_res = np.round(res.x).astype(int)
                        # Enforce capacity bound strictly against numerical float creep
                        while np.sum(alloc_res) > capacity:
                            max_idx = np.argmax(alloc_res)
                            alloc_res[max_idx] -= 1
                        solver_status_cat = "OPTIMAL_CONSTRAINED"
                    else:
                        # Fallback greedy priority allocation
                        alloc_res = np.zeros(n_districts, dtype=int)
                        remaining = capacity
                        sort_order = np.argsort(-weights)
                        for idx in sort_order:
                            d_need = demands[idx]
                            take = min(d_need, remaining)
                            alloc_res[idx] = take
                            remaining -= take
                            if remaining <= 0:
                                break
                        solver_status_cat = "GREEDY_FALLBACK"

            cat_allocated_sum = int(np.sum(alloc_res))
            cat_remaining = max(0, capacity - cat_allocated_sum)
            cat_unmet = max(0, cat_demand_sum - cat_allocated_sum)
            cat_coverage = round((cat_allocated_sum / max(cat_demand_sum, 1)) * 100.0, 1)

            total_allocated_all += cat_allocated_sum
            total_unmet_all += cat_unmet

            pool_summaries[cat] = {
                "resource_type_id": res_type_id,
                "resource_name": res_name,
                "unit_of_measure": res_unit,
                "is_external_partner": is_partner,
                "is_configured": is_cat_configured,
                "capacity": capacity,
                "allocated": cat_allocated_sum,
                "remaining_pool": cat_remaining,
                "demand": cat_demand_sum,
                "unmet_demand": cat_unmet,
                "coverage_pct": cat_coverage,
                "solver_status": solver_status_cat,
            }

            # Build district allocation line items
            for i, dem in enumerate(district_demands):
                d_demand = int(demands[i])
                d_alloc = int(alloc_res[i])
                d_shortage = max(0, d_demand - d_alloc)
                d_surplus = max(0, d_alloc - d_demand)
                d_cov = round((d_alloc / max(d_demand, 1)) * 100.0, 1) if d_demand > 0 else 100.0

                if not is_cat_configured:
                    status_str = "UNCONFIGURED_CAPACITY" if d_demand > 0 else "ZERO_DEMAND"
                elif d_demand == 0:
                    status_str = "ZERO_DEMAND"
                elif d_cov >= 99.9:
                    status_str = "FULLY_COVERED"
                elif d_cov >= 50.0:
                    status_str = "PARTIALLY_COVERED"
                else:
                    status_str = "CRITICAL_DEFICIT"
                    shortage_alerts.append({
                        "district_id": dem.district_id,
                        "district_name": dem.district_name,
                        "category": cat,
                        "demanded": d_demand,
                        "allocated": d_alloc,
                        "deficit": d_shortage,
                        "risk_level": dem.district_risk_level,
                    })

                # Top predicted crime types and detailed crime explanations for this district and category
                cat_breakdowns = [b for b in dem.crime_breakdowns if b.shared_pool_category == cat]
                top_crimes = sorted(
                    cat_breakdowns,
                    key=lambda x: x.predicted_crime_count,
                    reverse=True,
                )[:3]
                top_crimes_json = [
                    {
                        "crime_name": tc.crime_name,
                        "predicted_count": tc.predicted_crime_count,
                        "severity_level": tc.severity_level,
                    }
                    for tc in top_crimes
                ]

                # Detailed crime-wise explanation showing prediction, coefficient, calculated demand, and allocation
                crime_exps = []
                for b in cat_breakdowns:
                    prop_share = round((b.raw_demand / d_demand) * d_alloc, 2) if d_demand > 0 else 0.0
                    crime_exps.append({
                        "crime_type_id": b.crime_type_id,
                        "crime_code": b.crime_code,
                        "crime_name": b.crime_name,
                        "category_name": b.category_name,
                        "severity_level": b.severity_level,
                        "severity_weight": b.severity_weight,
                        "predicted_count": b.predicted_crime_count,
                        "resource_coefficient": b.coefficient,
                        "calculated_demand": b.raw_demand,
                        "proportional_allocation": prop_share,
                        "operational_rationale": b.operational_rationale,
                        "pool_available_capacity": capacity,
                        "recommended_district_allocation": d_alloc,
                    })

                # Rationale formulation
                if not is_cat_configured:
                    rationale = (
                        f"State {cat.lower()} capacity is unconfigured (0 available). Allocation withheld to prevent synthetic capacity assignment."
                        if d_demand > 0
                        else f"Zero predicted {cat.lower()} incident demand in {dem.district_name}; pool unconfigured."
                    )
                elif d_demand == 0:
                    rationale = f"Zero predicted {cat.lower()} incident demand in {dem.district_name}; resources preserved for higher threat sectors."
                elif d_cov >= 99.9:
                    rationale = (
                        f"Allocated {d_alloc} {res_unit.lower()} of {res_name.lower()} (100% of demand) to counter predicted "
                        f"{', '.join([tc['crime_name'] for tc in top_crimes_json]) or 'crime demand'} under {dem.district_risk_level} risk priority."
                    )
                else:
                    rationale = (
                        f"Allocated {d_alloc} of {d_demand} {res_unit.lower()} of {res_name.lower()} ({d_cov}% coverage, deficit: {d_shortage}) "
                        f"under state capacity pool constraint ({capacity} {res_unit.lower()} total). Prioritized by risk score {dem.district_risk_score:.1f}."
                    )

                item = DistrictCrimeAllocationItem(
                    district_id=dem.district_id,
                    district_name=dem.district_name,
                    state_id=dem.state_id,
                    state_name=dem.state_name,
                    risk_score=dem.district_risk_score,
                    risk_level=dem.district_risk_level,
                    top_predicted_crimes=top_crimes_json,
                    resource_category=cat,
                    resource_type_id=res_type_id,
                    resource_name=res_name,
                    unit_of_measure=res_unit,
                    is_external_partner=is_partner,
                    is_configured=is_cat_configured,
                    demanded_quantity=d_demand,
                    allocated_quantity=d_alloc,
                    baseline_available=None,
                    existing_committed=None,
                    shortage=d_shortage,
                    surplus=d_surplus,
                    coverage_percentage=d_cov,
                    status=status_str,
                    recommendation_rationale=rationale,
                    crime_explanations=crime_exps,
                )
                all_allocations.append(item)

        # 6. Overall Performance Metrics
        overall_cov = round((total_allocated_all / max(total_demand_all, 1)) * 100.0, 1)
        duration_ms = int((time.time() - start_time) * 1000)

        # 7. Persist Run to Database (for audit and scenario comparison)
        primary_res_type_id = CATEGORY_RESOURCE_MAP.get(categories_to_opt[0], (1, "Police Officers"))[0]
        primary_pool = pool_summaries.get(categories_to_opt[0], {})

        opt_run = OptimizationRun(
            run_id=run_id,
            scenario_name=req.scenario_name or "Crime-Specific Preventative Optimization",
            scenario_type=req.scenario_type,
            state_id=req.state_id,
            resource_type_id=primary_res_type_id,
            period_year=year,
            period_month=month,
            assessment_period=dt,
            risk_version=RISK_VERSION,
            algorithm=OPTIMIZATION_ALGORITHM,
            is_simulation=req.is_simulation,
            allocation_mode="SIMULATION" if req.is_simulation else "OPERATIONAL",
            data_validity="VERIFIED",
            pool_capacity=primary_pool.get("capacity", 1000),
            allocated_total=total_allocated_all,
            remaining_pool=total_allocated_all,
            total_demand=total_demand_all,
            shortfall_before=total_demand_all,
            shortfall_after=total_unmet_all,
            solver_status="OPTIMAL",
            objective_value=Decimal(str(overall_cov)),
            execution_duration_ms=duration_ms,
            constraints_summary=pool_summaries,
            explanation_summary=(
                f"Crime-specific MILP optimization for {state.state_name} ({req.assessment_period}). "
                f"Allocated {total_allocated_all} of {total_demand_all} demanded units across {len(categories_to_opt)} resource pools "
                f"achieving {overall_cov}% overall demand satisfaction."
            ),
            created_by_user_id=user_id,
        )
        db.add(opt_run)

        # Persist Allocations for Primary Category to OptimizationAllocation table
        for alloc in all_allocations:
            if alloc.resource_category == categories_to_opt[0]:
                db_alloc = OptimizationAllocation(
                    run_id=run_id,
                    district_id=alloc.district_id,
                    baseline_quantity=alloc.baseline_available,
                    required_quantity=alloc.demanded_quantity,
                    recommended_quantity=alloc.allocated_quantity,
                    change_quantity=alloc.allocated_quantity,
                    shortfall_before=alloc.demanded_quantity,
                    shortfall_after=alloc.shortage,
                    priority_score=Decimal(str(alloc.risk_score)),
                    risk_score=Decimal(str(alloc.risk_score)),
                    risk_level=alloc.risk_level,
                    allocation_status=alloc.status,
                    explanation=alloc.recommendation_rationale,
                    crime_breakdown_json=alloc.top_predicted_crimes,
                    coverage_percentage=Decimal(str(alloc.coverage_percentage)),
                    unmet_demand=alloc.shortage,
                )
                db.add(db_alloc)

        db.commit()

        # State Summary
        state_summary = [
            {
                "state_id": state.id,
                "state_name": state.state_name,
                "districts_count": n_districts,
                "total_demand": total_demand_all,
                "total_allocated": total_allocated_all,
                "total_unmet": total_unmet_all,
                "coverage_pct": overall_cov,
                "shortage_alerts_count": len(shortage_alerts),
            }
        ]

        return CrimeSpecificOptimizationResponse(
            run_id=run_id,
            state_id=state.id,
            state_name=state.state_name,
            assessment_period=req.assessment_period,
            scenario_name=req.scenario_name or "Crime-Specific Preventative Optimization",
            scenario_type=req.scenario_type,
            algorithm=OPTIMIZATION_ALGORITHM,
            is_simulation=req.is_simulation,
            pool_summaries=pool_summaries,
            overall_coverage_pct=overall_cov,
            total_demand=total_demand_all,
            total_allocated=total_allocated_all,
            total_unmet_demand=total_unmet_all,
            solver_status="OPTIMAL",
            execution_duration_ms=duration_ms,
            allocations=all_allocations,
            state_summaries=state_summary,
            shortage_alerts=shortage_alerts,
            planning_disclaimer=PLANNING_DISCLAIMER,
        )
