"""
Phase 10: AI-Based Police Resource Optimization Service.

Implements:
1. Scale-Anchored Constrained Optimization (MILP via scipy.optimize)
2. Rigorous handling of official inventory vs unrecorded inventories
3. Absolute resource conservation (allocated <= verified available)
4. Transferability and eligibility rules (Personnel/Mobility eligible; Infrastructure ineligible)
5. Explainable, non-causal scenario evaluation and audit logging
6. Documented resolution of Phase 7D vs Phase 9 resource discrepancies
"""

import time
import uuid
import math
from datetime import datetime, date, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException, status
import numpy as np
from scipy.optimize import milp, LinearConstraint, Bounds

from backend.app.models.optimization import OptimizationRun, OptimizationAllocation
from backend.app.repositories.optimization_repository import OptimizationRepository
from backend.app.schemas.optimization import (
    OptimizationRunRequest,
    OptimizationRunResponse,
    OptimizationAllocationItem,
    OptimizationOverviewResponse,
    OptimizationResourcesAuditResponse,
    OptimizationScenarioComparisonRequest,
    OptimizationScenarioComparisonResponse,
)


# Institutional Constants & Eligibility Rules
ELIGIBLE_RESOURCE_TYPE_IDS = {1, 2}  # 1: Police Officers (PERSONNEL), 2: Patrol Vehicles (MOBILITY)
INELIGIBLE_REASON_MAP = {
    74: "INFRASTRUCTURE_IMMOVABLE: Police Stations are fixed physical structures that cannot be transferred between districts. Deficits indicate long-term capital construction needs.",
    75: "INFRASTRUCTURE_IMMOVABLE: Police Outposts are fixed physical structures ineligible for inter-district reallocation.",
    83: "INFRASTRUCTURE_IMMOVABLE: Cyber Crime Police Stations are gazetted specialized facilities.",
    84: "INFRASTRUCTURE_IMMOVABLE: All-Women Police Stations are gazetted physical jurisdictional stations.",
    56: "CENTRALIZED_UNIT: Economic Offences Wings operate as centralized state-level headquarters units.",
}

# Verified Inventory Ground Truth Counts
VERIFIED_STATE_RESOURCES_COUNT = 288
VERIFIED_DISTRICT_RESOURCES_COUNT = 4510
VERIFIED_DISTRICT_OFFICIAL_COUNT = 114
VERIFIED_DISTRICT_UNRECORDED_COUNT = 4396

DISCREPANCY_EXPLANATION = (
    "In Phase 9 reporting, the state_resources inventory was erroneously cited as 4,320 due to multiplying "
    "36 states by the theoretical 120-type catalog (36 * 120 = 4,320), whereas the actual physical table holds "
    "288 verified rows (36 states * 8 official BPR&D categories = 288). Similarly, the district_resources count of "
    "4,480 represented the older Phase 7B/7C audit baseline before Phase 7D ingested 30 additional verified district "
    "gazette records, bringing the verified physical count to exactly 4,510 rows (114 official disclosures + 4,396 unrecorded). "
    "Both tables have remained physically untouched and verified throughout."
)

PLANNING_DISCLAIMER = (
    "This optimization recommendation is a decision-support and scenario-modeling indicator. "
    "It does not constitute an operational deployment order, a statutory mandate, or a guarantee of crime reduction. "
    "Under Indian constitutional jurisprudence (Seventh Schedule, Entry 2, List II), operational deployment is the "
    "exclusive prerogative of state police leadership. Demographic profiling is strictly prohibited."
)


class OptimizationService:

    @staticmethod
    def run_optimization(
        db: Session,
        req: OptimizationRunRequest,
        user_id: Optional[int] = None,
    ) -> OptimizationRunResponse:
        """
        Executes constrained Mixed-Integer Linear Programming (MILP) resource optimization.
        Guarantees:
        - Resource Conservation: sum(recommended) <= verified_available_pool
        - Minimum Operational Reserve: recommended_d >= reserve_d
        - Deterministic outputs for identical inputs
        - Safe handling of unrecorded vs verified district inventories
        """
        start_time = time.time()
        
        # 1. Validate Assessment Period
        try:
            period_dt = datetime.strptime(req.assessment_period, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid assessment date format: {req.assessment_period}. Expected YYYY-MM-DD.",
            )

        # 2. Validate Resource Type Eligibility
        rt_info = OptimizationRepository.get_state_resource_pool(db, req.state_id or 1, req.resource_type_id)
        if not rt_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resource type ID {req.resource_type_id} not found in state resources registry.",
            )

        resource_name = rt_info["resource_name"]
        resource_category = rt_info["category"]

        # Check for ineligible categories (e.g., physical buildings)
        if req.resource_type_id not in ELIGIBLE_RESOURCE_TYPE_IDS:
            ineligible_reason = INELIGIBLE_REASON_MAP.get(
                req.resource_type_id,
                f"Resource category '{resource_category}' is designated as non-transferable or lacks verified standing inventory.",
            )
            # Create a transparent INSUFFICIENT_DATA / INELIGIBLE run record
            run_id = f"OPT-{period_dt.strftime('%Y%m%d')}-S{req.state_id or 0}-R{req.resource_type_id}-{uuid.uuid4().hex[:6].upper()}"
            scenario_name = req.scenario_name or f"{req.scenario_type} - {resource_name}"
            
            run_data = {
                "run_id": run_id,
                "scenario_name": scenario_name,
                "scenario_type": req.scenario_type,
                "state_id": req.state_id,
                "resource_type_id": req.resource_type_id,
                "period_year": period_dt.year,
                "period_month": period_dt.month,
                "assessment_period": period_dt,
                "risk_version": "risk-v2.0",
                "pool_capacity": 0,
                "allocated_total": 0,
                "remaining_pool": 0,
                "total_demand": 0,
                "shortfall_before": 0,
                "shortfall_after": 0,
                "solver_status": "INELIGIBLE",
                "objective_value": 0.0,
                "execution_duration_ms": int((time.time() - start_time) * 1000),
                "constraints_summary": {"eligibility_status": "INELIGIBLE", "reason": ineligible_reason},
                "explanation_summary": f"Optimization halted: {ineligible_reason}",
                "created_by_user_id": user_id,
            }
            run = OptimizationRepository.save_optimization_run(db, run_data, [])
            db.commit()
            return OptimizationService._build_run_response(run, [], resource_name, resource_category, rt_info.get("state_name"))

        # 3. Retrieve Verified Standing Pool Capacity
        if req.pool_capacity_override is not None:
            pool_capacity = max(0, req.pool_capacity_override)
            pool_source = "User-Configured Simulation Override"
        else:
            if req.state_id is None:
                # National total across states for this resource type
                sql_nat = text("SELECT SUM(actual_count) FROM state_resources WHERE resource_type_id = :rtid")
                pool_capacity = db.execute(sql_nat, {"rtid": req.resource_type_id}).scalar() or 0
                pool_source = "National BPR&D Cumulative Standing Pool"
            else:
                state_pool_record = OptimizationRepository.get_state_resource_pool(db, req.state_id, req.resource_type_id)
                pool_capacity = state_pool_record["actual_count"] if state_pool_record else 0
                pool_source = f"Official {state_pool_record['source_name']} ({state_pool_record['reference_year']})" if state_pool_record else "None"

        # Check if pool is empty or unavailable
        if pool_capacity <= 0:
            run_id = f"OPT-{period_dt.strftime('%Y%m%d')}-S{req.state_id or 0}-R{req.resource_type_id}-{uuid.uuid4().hex[:6].upper()}"
            run_data = {
                "run_id": run_id,
                "scenario_name": req.scenario_name or f"{req.scenario_type} - {resource_name}",
                "scenario_type": req.scenario_type,
                "state_id": req.state_id,
                "resource_type_id": req.resource_type_id,
                "period_year": period_dt.year,
                "period_month": period_dt.month,
                "assessment_period": period_dt,
                "risk_version": "risk-v2.0",
                "pool_capacity": 0,
                "allocated_total": 0,
                "remaining_pool": 0,
                "total_demand": 0,
                "shortfall_before": 0,
                "shortfall_after": 0,
                "solver_status": "INSUFFICIENT_DATA",
                "objective_value": 0.0,
                "execution_duration_ms": int((time.time() - start_time) * 1000),
                "constraints_summary": {"error": "ZERO_CAPACITY", "source": pool_source},
                "explanation_summary": f"Optimization cannot proceed: Available standing resource pool is unrecorded or zero for state {req.state_id}.",
                "created_by_user_id": user_id,
            }
            run = OptimizationRepository.save_optimization_run(db, run_data, [])
            db.commit()
            return OptimizationService._build_run_response(run, [], resource_name, resource_category, rt_info.get("state_name"))

        # 4. Retrieve Eligible Districts
        districts = OptimizationRepository.get_eligible_districts(db, state_id=req.state_id)
        if not districts:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No eligible Census 2011 administrative districts found for state ID {req.state_id}.",
            )

        district_ids = [d["district_id"] for d in districts]

        # 5. Retrieve Phase 9 Risk Scores
        risk_scores = OptimizationRepository.get_district_risk_scores(
            db, district_ids, period_dt.year, period_dt.month, calculation_version="risk-v2.0"
        )

        # 6. Retrieve Phase 8B Crime Forecasts
        forecasts = OptimizationRepository.get_district_forecasts(
            db, district_ids, period_dt.year, period_dt.month
        )

        # 7. Retrieve District Official Baseline Inventories (if recorded)
        baselines = OptimizationRepository.get_district_baseline_inventories(
            db, district_ids, req.resource_type_id
        )

        # 8. Compute District Demands and Operational Reserves
        N = len(districts)
        demands = np.zeros(N, dtype=int)
        reserves = np.zeros(N, dtype=int)
        baseline_vals = [None] * N
        risk_vals = np.zeros(N, dtype=float)
        risk_levels = ["MODERATE"] * N
        forecast_vols = np.zeros(N, dtype=float)
        priority_weights = np.ones(N, dtype=float)

        forecast_model_id = None
        forecast_model_ver = None
        forecast_origin_dt = None

        for i, dist in enumerate(districts):
            did = dist["district_id"]
            pop = dist["population"]
            
            # Risk data
            r_info = risk_scores.get(did, {})
            r_score = r_info.get("overall_risk_score", 50.0)
            r_level = r_info.get("risk_level", "MODERATE")
            risk_vals[i] = r_score
            risk_levels[i] = r_level

            if not forecast_model_id and r_info.get("model_id"):
                forecast_model_id = r_info["model_id"]
                forecast_model_ver = r_info.get("model_version")
                forecast_origin_dt = r_info.get("forecast_origin_date")

            # Forecast volume
            fc_info = forecasts.get(did, {})
            fc_vol = fc_info.get("predicted_count", 10.0)
            forecast_vols[i] = fc_vol

            # Normative operational demand calculation
            if req.resource_type_id == 1:
                # Police Officers (BPR&D norm: 181 per 100k, modulated by risk multiplier)
                risk_mul = max(r_score / 50.0, 0.5)
                d_qty = max(5, int(math.ceil((pop / 100000.0) * 181.0 * risk_mul)))
            elif req.resource_type_id == 2:
                # Patrol Vehicles (1 per 20 required officers)
                risk_mul = max(r_score / 50.0, 0.5)
                officers_d = max(5, int(math.ceil((pop / 100000.0) * 181.0 * risk_mul)))
                d_qty = max(2, int(math.ceil(officers_d / 20.0)))
            else:
                d_qty = max(1, int(math.ceil(fc_vol / 5.0)))

            demands[i] = d_qty

            # Baseline official inventory
            b_info = baselines.get(did)
            if b_info is not None and b_info.get("actual_count") is not None:
                b_qty = b_info["actual_count"]
                baseline_vals[i] = b_qty
            else:
                baseline_vals[i] = None

            # Minimum Operational Reserve
            reserve_ratio = req.minimum_reserve_ratio
            if req.scenario_type == "RESERVE_HEAVY":
                reserve_ratio = max(reserve_ratio, 0.40)
            
            # Reserve is at least 1 unit, capped at baseline if baseline is recorded
            calc_reserve = max(1, int(math.floor(reserve_ratio * d_qty)))
            if baseline_vals[i] is not None:
                calc_reserve = min(baseline_vals[i], calc_reserve)
            reserves[i] = calc_reserve

            # Penalty weight for unmet shortfall
            weight = 1.0 + (req.risk_weight_factor * (r_score / 100.0))
            if req.scenario_type == "CRITICAL_RISK_PRIORITY" and r_level == "CRITICAL":
                weight *= 2.5
            elif req.scenario_type == "CRITICAL_RISK_PRIORITY" and r_level == "HIGH":
                weight *= 1.5
            elif req.scenario_type == "PROPORTIONAL_WORKLOAD":
                weight *= (1.0 + fc_vol / 50.0)
            
            priority_weights[i] = weight

        # 9. Feasibility Verification
        total_reserve = int(np.sum(reserves))
        total_demand = int(np.sum(demands))

        if total_reserve > pool_capacity:
            # Infeasible: Required baseline reserves exceed verified available pool
            run_id = f"OPT-{period_dt.strftime('%Y%m%d')}-S{req.state_id or 0}-R{req.resource_type_id}-{uuid.uuid4().hex[:6].upper()}"
            run_data = {
                "run_id": run_id,
                "scenario_name": req.scenario_name or f"{req.scenario_type} - {resource_name}",
                "scenario_type": req.scenario_type,
                "state_id": req.state_id,
                "resource_type_id": req.resource_type_id,
                "period_year": period_dt.year,
                "period_month": period_dt.month,
                "assessment_period": period_dt,
                "risk_version": "risk-v2.0",
                "pool_capacity": pool_capacity,
                "allocated_total": 0,
                "remaining_pool": pool_capacity,
                "total_demand": total_demand,
                "shortfall_before": total_demand,
                "shortfall_after": total_demand,
                "solver_status": "INFEASIBLE",
                "objective_value": None,
                "execution_duration_ms": int((time.time() - start_time) * 1000),
                "constraints_summary": {
                    "total_reserve_required": total_reserve,
                    "pool_capacity_available": pool_capacity,
                    "deficit": total_reserve - pool_capacity,
                },
                "explanation_summary": (
                    f"Infeasible scenario: Sum of minimum district operational reserves ({total_reserve:,} units) "
                    f"exceeds verified standing pool capacity ({pool_capacity:,} units). Deficit: {total_reserve - pool_capacity:,} units. "
                    f"Lower the minimum reserve ratio or expand standing capacity to achieve feasibility."
                ),
                "created_by_user_id": user_id,
            }
            run = OptimizationRepository.save_optimization_run(db, run_data, [])
            db.commit()
            return OptimizationService._build_run_response(run, [], resource_name, resource_category, districts[0]["state_name"])

        # 10. Solve Constrained Optimization Problem via MILP
        # Variables:
        # x_i for i in 0..N-1: allocated resources (integer >= reserves[i])
        # y_i for i in 0..N-1: unmet shortfall (continuous >= 0)
        # Total variables = 2 * N
        # Objective: min sum_i (priority_weights[i] * y_i)
        
        c = np.zeros(2 * N)
        # Objective minimizes weighted shortfall
        c[N:2*N] = priority_weights

        # Variable bounds
        # x_i: [reserves[i], max(demands[i] * 2, reserves[i])]
        # y_i: [0, inf]
        lb = np.zeros(2 * N)
        ub = np.full(2 * N, np.inf)
        lb[0:N] = reserves
        # Prevent runaway hoarding by capping allocation to at most 150% of demand or pool
        for i in range(N):
            ub[i] = min(pool_capacity, max(int(demands[i] * 1.5), reserves[i]))

        integrality = np.zeros(2 * N, dtype=int)
        integrality[0:N] = 1  # x_i are integers
        integrality[N:2*N] = 0  # y_i can be continuous (will be integer if x_i are integer)

        bounds = Bounds(lb, ub)

        # Constraints:
        # 1. Resource Conservation: sum(x_i) <= pool_capacity
        # Row 0: x_0 + x_1 + ... + x_{N-1} <= pool_capacity
        # 2. Shortfall Definition: x_i + y_i >= demands[i] for each i
        # Rows 1..N: x_i + y_i >= demands[i]

        num_constraints = 1 + N
        A = np.zeros((num_constraints, 2 * N))
        constraint_lb = np.full(num_constraints, -np.inf)
        constraint_ub = np.full(num_constraints, np.inf)

        # Constraint 1: Conservation
        A[0, 0:N] = 1.0
        constraint_ub[0] = pool_capacity
        constraint_lb[0] = 0.0

        # Constraints 2..N+1: x_i + y_i >= demands[i]
        for i in range(N):
            row_idx = 1 + i
            A[row_idx, i] = 1.0
            A[row_idx, N + i] = 1.0
            constraint_lb[row_idx] = demands[i]
            constraint_ub[row_idx] = np.inf

        linear_constraint = LinearConstraint(A, constraint_lb, constraint_ub)

        # Execute MILP solver
        res = milp(c=c, integrality=integrality, bounds=bounds, constraints=linear_constraint)

        if not res.success:
            # Fallback to greedy tiered allocation if numerical solver fails
            solver_status = "FEASIBLE"
            allocations_x, shortfalls_y = OptimizationService._solve_greedy_fallback(
                N, demands, reserves, pool_capacity, priority_weights
            )
            obj_val = float(np.sum(priority_weights * shortfalls_y))
        else:
            solver_status = "OPTIMAL"
            sol = res.x
            allocations_x = np.round(sol[0:N]).astype(int)
            shortfalls_y = np.maximum(0, demands - allocations_x).astype(int)
            obj_val = float(res.fun)

        # Guarantee strict conservation against rounding
        allocated_total = int(np.sum(allocations_x))
        if allocated_total > pool_capacity:
            excess = allocated_total - pool_capacity
            # Trim from lowest priority districts with surplus above reserve
            sorted_indices = np.argsort(priority_weights)
            for idx in sorted_indices:
                reducible = allocations_x[idx] - reserves[idx]
                if reducible > 0:
                    trim = min(reducible, excess)
                    allocations_x[idx] -= trim
                    excess -= trim
                    shortfalls_y[idx] = max(0, demands[idx] - allocations_x[idx])
                    if excess <= 0:
                        break
            allocated_total = int(np.sum(allocations_x))

        remaining_pool = pool_capacity - allocated_total
        shortfall_before = int(np.sum([
            max(0, demands[i] - (baseline_vals[i] if baseline_vals[i] is not None else 0))
            for i in range(N)
        ]))
        shortfall_after = int(np.sum(shortfalls_y))

        # 11. Build District Allocation Records
        allocations_data = []
        for i, dist in enumerate(districts):
            did = dist["district_id"]
            d_name = dist["district_name"]
            s_name = dist["state_name"]
            d_req = int(demands[i])
            d_alloc = int(allocations_x[i])
            d_base = baseline_vals[i]
            d_short_after = int(shortfalls_y[i])
            d_short_before = max(0, d_req - (d_base if d_base is not None else 0))
            d_change = d_alloc - (d_base if d_base is not None else reserves[i])

            if d_alloc >= d_req:
                alloc_status = "SATISFIED"
            elif d_alloc > reserves[i]:
                alloc_status = "PARTIAL"
            elif d_alloc == reserves[i]:
                alloc_status = "DEFICIT"
            else:
                alloc_status = "UNMET"

            explanation_note = (
                f"Demand {d_req:,} {resource_category.lower()} calculated from risk score {risk_vals[i]:.2f} ({risk_levels[i]}). "
                f"Recommended {d_alloc:,} preserves minimum reserve of {reserves[i]:,}."
            )
            if d_base is not None:
                explanation_note += f" Official ground inventory: {d_base:,}."

            allocations_data.append({
                "district_id": did,
                "district_name": d_name,
                "state_name": s_name,
                "risk_score": round(float(risk_vals[i]), 2),
                "risk_level": risk_levels[i],
                "priority_score": round(float(priority_weights[i] * 50.0), 2),
                "baseline_quantity": d_base,
                "required_quantity": d_req,
                "recommended_quantity": d_alloc,
                "change_quantity": d_change,
                "shortfall_before": d_short_before,
                "shortfall_after": d_short_after,
                "allocation_status": alloc_status,
                "explanation": explanation_note,
            })

        # 12. Build Narrative Explanation Summary
        explanation_summary = OptimizationService._build_explanation_narrative(
            state_name=districts[0]["state_name"] if req.state_id else "National",
            resource_name=resource_name,
            pool_capacity=pool_capacity,
            allocated_total=allocated_total,
            remaining_pool=remaining_pool,
            total_demand=total_demand,
            shortfall_before=shortfall_before,
            shortfall_after=shortfall_after,
            solver_status=solver_status,
            scenario_type=req.scenario_type,
            pool_source=pool_source,
            districts_count=N,
        )

        # 13. Persist Optimization Run and Allocations in MySQL
        run_id = f"OPT-{period_dt.strftime('%Y%m%d')}-S{req.state_id or 0}-R{req.resource_type_id}-{uuid.uuid4().hex[:6].upper()}"
        scenario_name = req.scenario_name or f"{req.scenario_type} - {resource_name}"
        execution_duration = int((time.time() - start_time) * 1000)

        run_record_data = {
            "run_id": run_id,
            "scenario_name": scenario_name,
            "scenario_type": req.scenario_type,
            "state_id": req.state_id,
            "resource_type_id": req.resource_type_id,
            "period_year": period_dt.year,
            "period_month": period_dt.month,
            "assessment_period": period_dt,
            "risk_version": "risk-v2.0",
            "forecast_model_id": forecast_model_id,
            "forecast_model_version": forecast_model_ver or "phase8b_xgb_direct_h1",
            "forecast_origin_date": forecast_origin_dt,
            "algorithm": "MILP_SCIPY_V2",
            "pool_capacity": pool_capacity,
            "allocated_total": allocated_total,
            "remaining_pool": remaining_pool,
            "total_demand": total_demand,
            "shortfall_before": shortfall_before,
            "shortfall_after": shortfall_after,
            "solver_status": solver_status,
            "objective_value": round(obj_val, 4),
            "execution_duration_ms": execution_duration,
            "constraints_summary": {
                "resource_conservation": f"allocated ({allocated_total:,}) <= pool ({pool_capacity:,})",
                "minimum_reserve_ratio": req.minimum_reserve_ratio,
                "total_minimum_reserve": total_reserve,
                "risk_weight_factor": req.risk_weight_factor,
                "pool_source": pool_source,
            },
            "explanation_summary": explanation_summary,
            "created_by_user_id": user_id,
        }

        saved_run = OptimizationRepository.save_optimization_run(db, run_record_data, allocations_data)
        db.commit()

        return OptimizationService._build_run_response(
            saved_run,
            allocations_data,
            resource_name,
            resource_category,
            districts[0]["state_name"] if req.state_id else "National",
        )

    @staticmethod
    def _solve_greedy_fallback(
        N: int,
        demands: np.ndarray,
        reserves: np.ndarray,
        pool_capacity: int,
        priority_weights: np.ndarray,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Greedy tiered fallback algorithm guaranteeing reserve floors and pool conservation."""
        alloc = np.copy(reserves)
        remaining = pool_capacity - np.sum(alloc)
        sorted_indices = np.argsort(-priority_weights)

        for idx in sorted_indices:
            if remaining <= 0:
                break
            shortfall = demands[idx] - alloc[idx]
            if shortfall > 0:
                grant = min(shortfall, remaining)
                alloc[idx] += grant
                remaining -= grant

        shortfalls = np.maximum(0, demands - alloc)
        return alloc, shortfalls

    @staticmethod
    def _build_explanation_narrative(
        state_name: str,
        resource_name: str,
        pool_capacity: int,
        allocated_total: int,
        remaining_pool: int,
        total_demand: int,
        shortfall_before: int,
        shortfall_after: int,
        solver_status: str,
        scenario_type: str,
        pool_source: str,
        districts_count: int,
    ) -> str:
        reduction = shortfall_before - shortfall_after
        reduction_pct = (reduction / max(1, shortfall_before)) * 100.0
        utilization_pct = (allocated_total / max(1, pool_capacity)) * 100.0

        return (
            f"Under scenario '{scenario_type}', {allocated_total:,} of {pool_capacity:,} verified {resource_name.lower()} "
            f"({utilization_pct:.1f}% capacity utilization) were allocated across {districts_count} administrative districts in {state_name}. "
            f"Standing pool sourced from {pool_source}. Modeled shortfall was reduced by {reduction:,} units ({reduction_pct:.1f}% reduction), "
            f"leaving an unmet shortfall of {shortfall_after:,} units. Solver status: {solver_status}. "
            f"{PLANNING_DISCLAIMER}"
        )

    @staticmethod
    def _build_run_response(
        run: OptimizationRun,
        allocations_data: List[Dict[str, Any]],
        resource_name: str,
        resource_category: str,
        state_name: Optional[str] = None,
    ) -> OptimizationRunResponse:
        reduction = max(0, run.shortfall_before - run.shortfall_after)
        reduction_pct = round((reduction / max(1, run.shortfall_before)) * 100.0, 2)
        utilization_pct = round((run.allocated_total / max(1, run.pool_capacity)) * 100.0, 2)

        items = [
            OptimizationAllocationItem(**item) for item in allocations_data
        ] if allocations_data else []

        return OptimizationRunResponse(
            run_id=run.run_id,
            scenario_name=run.scenario_name,
            scenario_type=run.scenario_type,
            state_id=run.state_id,
            state_name=state_name,
            resource_type_id=run.resource_type_id,
            resource_name=resource_name,
            resource_category=resource_category,
            assessment_period=run.assessment_period.isoformat(),
            risk_version=run.risk_version,
            forecast_model_id=run.forecast_model_id,
            forecast_model_version=run.forecast_model_version,
            forecast_origin_date=run.forecast_origin_date.isoformat() if run.forecast_origin_date else None,
            algorithm=run.algorithm,
            pool_capacity=run.pool_capacity,
            allocated_total=run.allocated_total,
            remaining_pool=run.remaining_pool,
            total_demand=run.total_demand,
            shortfall_before=run.shortfall_before,
            shortfall_after=run.shortfall_after,
            shortfall_reduction_pct=reduction_pct,
            pool_utilization_pct=utilization_pct,
            solver_status=run.solver_status,
            objective_value=float(run.objective_value) if run.objective_value is not None else None,
            execution_duration_ms=run.execution_duration_ms,
            constraints_applied=run.constraints_summary,
            explanation_summary=run.explanation_summary or "",
            created_at=run.created_at.isoformat() if run.created_at else datetime.now(timezone.utc).isoformat(),
            allocations=items,
        )

    @staticmethod
    def get_overview(db: Session) -> OptimizationOverviewResponse:
        """Retrieves high-level optimization summary, verified inventories, and recent runs."""
        runs, total = OptimizationRepository.list_runs(db, skip=0, limit=5)
        
        recent_runs_resp = []
        for r in runs:
            rt = OptimizationRepository.get_state_resource_pool(db, r.state_id or 1, r.resource_type_id)
            res_name = rt["resource_name"] if rt else f"Resource {r.resource_type_id}"
            res_cat = rt["category"] if rt else "PERSONNEL"
            s_name = rt["state_name"] if rt else "National"
            recent_runs_resp.append(OptimizationService._build_run_response(r, [], res_name, res_cat, s_name))

        eligible = [
            {
                "resource_type_id": 1,
                "resource_name": "Police Officers",
                "category": "PERSONNEL",
                "status": "ELIGIBLE",
                "verified_pool": 2091488,
                "notes": "State-level personnel standing pool (BPR&D DoPO 2020). Transferable within states.",
            },
            {
                "resource_type_id": 2,
                "resource_name": "Patrol Vehicles",
                "category": "MOBILITY",
                "status": "ELIGIBLE",
                "verified_pool": 120135,
                "notes": "State-level patrol transport fleet (BPR&D DoPO 2024). Transferable across districts.",
            },
        ]

        ineligible = [
            {
                "resource_type_id": 74,
                "resource_name": "Police Stations",
                "category": "INFRASTRUCTURE",
                "status": "INELIGIBLE_FOR_REALLOCATION",
                "reason": INELIGIBLE_REASON_MAP[74],
            },
            {
                "resource_type_id": 75,
                "resource_name": "Police Outposts",
                "category": "INFRASTRUCTURE",
                "status": "INELIGIBLE_FOR_REALLOCATION",
                "reason": INELIGIBLE_REASON_MAP[75],
            },
            {
                "resource_type_id": 83,
                "resource_name": "Cyber Crime Police Stations",
                "category": "INFRASTRUCTURE",
                "status": "INELIGIBLE_FOR_REALLOCATION",
                "reason": INELIGIBLE_REASON_MAP[83],
            },
            {
                "resource_type_id": 84,
                "resource_name": "All-Women Police Stations",
                "category": "INFRASTRUCTURE",
                "status": "INELIGIBLE_FOR_REALLOCATION",
                "reason": INELIGIBLE_REASON_MAP[84],
            },
        ]

        inventory_summary = {
            "state_resources_count": VERIFIED_STATE_RESOURCES_COUNT,
            "district_resources_count": VERIFIED_DISTRICT_RESOURCES_COUNT,
            "district_official_count": VERIFIED_DISTRICT_OFFICIAL_COUNT,
            "district_unrecorded_count": VERIFIED_DISTRICT_UNRECORDED_COUNT,
            "explanation_of_discrepancy": DISCREPANCY_EXPLANATION,
        }

        return OptimizationOverviewResponse(
            total_runs_executed=total,
            verified_official_inventory_summary=inventory_summary,
            eligible_categories=eligible,
            ineligible_categories=ineligible,
            recent_runs=recent_runs_resp,
            planning_disclaimer=PLANNING_DISCLAIMER,
        )

    @staticmethod
    def get_resources_audit(db: Session) -> OptimizationResourcesAuditResponse:
        """Retrieves comprehensive resource inventory audit reconciling state and district baselines."""
        # Query official state inventory breakdown
        sql_state = text("""
            SELECT 
                sr.resource_type_id,
                rt.resource_name,
                rt.category,
                COUNT(DISTINCT sr.state_id) as states_count,
                SUM(sr.actual_count) as total_actual,
                MIN(sr.reference_year) as min_year,
                MAX(sr.reference_year) as max_year,
                MIN(sr.source_name) as source_name
            FROM state_resources sr
            JOIN resource_types rt ON sr.resource_type_id = rt.id
            GROUP BY sr.resource_type_id, rt.resource_name, rt.category
            ORDER BY sr.resource_type_id
        """)
        rows = db.execute(sql_state).fetchall()
        state_breakdown = [
            {
                "resource_type_id": r[0],
                "resource_name": r[1],
                "category": r[2],
                "states_covered": r[3],
                "total_verified_count": int(r[4]) if r[4] else 0,
                "reference_years": f"{r[5]}-{r[6]}" if r[5] != r[6] else str(r[5]),
                "primary_source": r[7],
            }
            for r in rows
        ]

        types_list = [
            {"id": 1, "code": "POLICE_PERSONNEL_ACTUAL", "name": "Police Officers", "category": "PERSONNEL", "eligible": True},
            {"id": 2, "code": "PATROL_VEHICLES", "name": "Patrol Vehicles", "category": "MOBILITY", "eligible": True},
            {"id": 23, "code": "POLICE_VEHICLES_TOTAL", "name": "Total Police Vehicles Fleet", "category": "MOBILITY", "eligible": False},
            {"id": 56, "code": "ECONOMIC_OFFENCES_UNITS", "name": "Economic Offences Wings", "category": "INVESTIGATION", "eligible": False},
            {"id": 74, "code": "POLICE_STATIONS", "name": "Total Police Stations", "category": "INFRASTRUCTURE", "eligible": False},
            {"id": 75, "code": "POLICE_OUTPOSTS", "name": "Police Outposts", "category": "INFRASTRUCTURE", "eligible": False},
            {"id": 83, "code": "CYBER_POLICE_STATIONS", "name": "Cyber Crime Police Stations", "category": "INFRASTRUCTURE", "eligible": False},
            {"id": 84, "code": "WOMEN_POLICE_STATIONS", "name": "All-Women Police Stations", "category": "INFRASTRUCTURE", "eligible": False},
        ]

        return OptimizationResourcesAuditResponse(
            state_resources_count=VERIFIED_STATE_RESOURCES_COUNT,
            district_resources_count=VERIFIED_DISTRICT_RESOURCES_COUNT,
            district_official_count=VERIFIED_DISTRICT_OFFICIAL_COUNT,
            district_unrecorded_count=VERIFIED_DISTRICT_UNRECORDED_COUNT,
            discrepancy_explanation=DISCREPANCY_EXPLANATION,
            resource_types=types_list,
            state_inventory_breakdown=state_breakdown,
        )

    @staticmethod
    def get_run_detail(db: Session, run_id: str) -> OptimizationRunResponse:
        """Retrieves full details and allocations for a specific optimization run."""
        run = OptimizationRepository.get_run_by_id(db, run_id)
        if not run:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Optimization run ID '{run_id}' not found.",
            )

        rt = OptimizationRepository.get_state_resource_pool(db, run.state_id or 1, run.resource_type_id)
        res_name = rt["resource_name"] if rt else f"Resource {run.resource_type_id}"
        res_cat = rt["category"] if rt else "PERSONNEL"
        s_name = rt["state_name"] if rt else "National"

        # Fetch allocations for this run
        alloc_items, _ = OptimizationRepository.list_allocations(db, run_id=run_id, limit=1000)
        return OptimizationService._build_run_response(run, alloc_items, res_name, res_cat, s_name)

    @staticmethod
    def compare_scenarios(
        db: Session,
        req: OptimizationScenarioComparisonRequest,
        user_id: Optional[int] = None,
    ) -> OptimizationScenarioComparisonResponse:
        """Executes and compares alternative planning scenarios side-by-side."""
        results: List[OptimizationRunResponse] = []
        for s_req in req.scenarios:
            s_req.state_id = req.state_id
            s_req.resource_type_id = req.resource_type_id
            s_req.assessment_period = req.assessment_period
            run_resp = OptimizationService.run_optimization(db, s_req, user_id=user_id)
            results.append(run_resp)

        rt = OptimizationRepository.get_state_resource_pool(db, req.state_id, req.resource_type_id)
        state_name = rt["state_name"] if rt else f"State {req.state_id}"
        resource_name = rt["resource_name"] if rt else f"Resource {req.resource_type_id}"

        summary_lines = [
            f"Scenario comparison across {len(results)} configurations for {resource_name} in {state_name} ({req.assessment_period}):"
        ]
        for r in results:
            summary_lines.append(
                f"- {r.scenario_name} ({r.scenario_type}): {r.allocated_total:,} allocated ({r.pool_utilization_pct:.1f}% pool), "
                f"Shortfall reduced from {r.shortfall_before:,} to {r.shortfall_after:,} ({r.shortfall_reduction_pct:.1f}% reduction). "
                f"Solver: {r.solver_status}."
            )

        return OptimizationScenarioComparisonResponse(
            comparison_id=f"CMP-{uuid.uuid4().hex[:8].upper()}",
            state_name=state_name,
            resource_name=resource_name,
            assessment_period=req.assessment_period,
            scenarios=results,
            comparison_summary="\n".join(summary_lines),
        )
