"""
Phase 10B: Resource Optimization Service.

Business logic layer implementing the frozen resource-v1.0 methodology:
- Scale-Anchored Risk-Modulated Workload Model (SARM-v1.0)
- Distinct operational drivers for Police Officers, Patrol Vehicles, Investigation Teams, Surveillance Units
- Rigorous handling of unrecorded vs verified inventory availability
- Priority tier classification and continuous priority score
- Constrained Greedy Tiered Priority Allocation
- Budget intelligence handoff
"""

from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
import json
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.repositories.resource_repository import ResourceRepository

from backend.app.schemas.resource import (
    ResourceItemResponse,
    ResourceOverviewResponse,
    DistrictResourceDetailResponse,
    ResourceModelInfoResponse,
    ResourceAllocationSimulationResponse,
    AllocationItem,
    StateResourceItemResponse,
    ResourceCoverageResponse,
    CategoryCoverageDetail,
    DistrictResourceItemResponse,
    ResourceCategoryDetailResponse,
    DistrictResourceGapResponse,
    AIResourceRecommendationResponse,
)
from backend.app.schemas.common import StandardListResponse


CALCULATION_VERSION = "resource-v1.0"
NATIONAL_MEAN_SEVERITY = 1.15


class ResourceService:
    @staticmethod
    def calculate_risk_multiplier(overall_risk_score: float) -> float:
        """
        Calculates the dimensionless risk multiplier M_risk(d).
        Normalized around the national median risk score (50.00).
        """
        return overall_risk_score / 50.00

    @staticmethod
    def calculate_officer_requirement(population: int, m_risk: float) -> int:
        """
        Q_officers(d) = max(5, round((10 + 5 * Population / 1,000,000) * M_risk))
        Minimum floor: 5 officers.
        """
        base = 10.0 + 5.0 * (float(population) / 1_000_000.0)
        req = int(round(base * m_risk))
        return max(5, req)

    @staticmethod
    def calculate_vehicle_requirement(q_officers: int) -> int:
        """
        Q_vehicles(d) = max(2, round(Q_officers / 3.0))
        Minimum floor: 2 vehicles.
        """
        req = int(round(float(q_officers) / 3.0))
        return max(2, req)

    @staticmethod
    def calculate_investigation_requirement(forecast_volume: float, severity_index: float) -> int:
        """
        Q_invest(d) = max(1, round((ForecastVolume / 2.0) * (SeverityIndex / 1.15)))
        Minimum floor: 1 team.
        """
        base = (float(forecast_volume) / 2.0) * (float(severity_index) / NATIONAL_MEAN_SEVERITY)
        req = int(round(base))
        return max(1, req)

    @staticmethod
    def calculate_surveillance_requirement(risk_level: str, trend_index: float) -> int:
        """
        Q_surveillance(d) = BaseTier + TrendBoost
        Base tier: LOW=1, MODERATE=2, HIGH=4, CRITICAL=6
        Trend boost: trend >= 65 -> +2; 50 <= trend < 65 -> +1; trend < 50 -> +0
        Bound: 1 to 8 units.
        """
        tier_map = {
            "LOW": 1,
            "MODERATE": 2,
            "HIGH": 4,
            "CRITICAL": 6,
        }
        base_tier = tier_map.get(risk_level.upper(), 2)

        if trend_index >= 65.0:
            trend_boost = 2
        elif trend_index >= 50.0:
            trend_boost = 1
        else:
            trend_boost = 0

        req = base_tier + trend_boost
        return max(1, min(8, req))

    @staticmethod
    def determine_priority_tier(risk_level: str, shortfall: int) -> str:
        """
        Priority Tiers:
        Tier 1: Risk = CRITICAL AND shortfall > 0
        Tier 2: Risk = HIGH AND shortfall > 0
        Tier 3: Risk = MODERATE AND shortfall > 0
        Tier 4: Risk = LOW OR shortfall == 0
        """
        if shortfall <= 0:
            return "LOW"

        rl = risk_level.upper()
        if rl == "CRITICAL":
            return "CRITICAL"
        elif rl == "HIGH":
            return "HIGH"
        elif rl == "MODERATE":
            return "MODERATE"
        else:
            return "LOW"

    @staticmethod
    def calculate_priority_score(overall_risk_score: float, shortfall: int, required: int) -> float:
        """
        P = OverallRiskScore * (0.70 + 0.30 * shortfall / max(required, 1))
        Bounded to [0.00, 100.00].
        """
        if shortfall <= 0:
            return 0.00

        ratio = float(shortfall) / max(float(required), 1.0)
        score = overall_risk_score * (0.70 + 0.30 * ratio)
        return round(min(100.0, max(0.0, score)), 2)

    @staticmethod
    def run_resource_optimization(
        db: Session,
        assessment_period: str = "2026-01-01",
        calculation_version: str = CALCULATION_VERSION,
    ) -> Dict[str, Any]:
        """
        Executes end-to-end resource optimization calculations across all 640 districts
        for all active resource types, and persists recommendations and budget estimations.
        """
        try:
            dt = datetime.strptime(assessment_period, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid assessment date format: {assessment_period}. Expected YYYY-MM-DD.",
            )

        period_year = dt.year
        period_month = dt.month

        # 1. Load active resource types
        resource_types = ResourceRepository.get_active_resource_types(db)
        if not resource_types:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active resource types found in resource_types table.",
            )

        # Map by name for exact resolution without hardcoding IDs
        rt_by_name = {rt["resource_name"]: rt for rt in resource_types}
        rt_officers = rt_by_name.get("Police Officers")
        rt_vehicles = rt_by_name.get("Patrol Vehicles")
        rt_invest = rt_by_name.get("Investigation Teams")
        rt_surv = rt_by_name.get("Surveillance Units")

        if not (rt_officers and rt_vehicles and rt_invest and rt_surv):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Missing required resource types (Police Officers, Patrol Vehicles, Investigation Teams, Surveillance Units).",
            )

        # 2. Load active resource costs
        resource_costs = ResourceRepository.get_active_resource_costs(db)

        # 3. Load 640 assessed districts with intelligence
        districts = ResourceRepository.get_districts_intelligence(
            db,
            period_year=period_year,
            period_month=period_month,
            risk_version="risk-v1.0",
            forecast_date=assessment_period,
        )
        if len(districts) != 640:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Expected 640 assessed districts, found {len(districts)}.",
            )

        # 4. Load district inventory availability (returns empty dict if unrecorded)
        availability_map = ResourceRepository.get_district_resources(
            db,
            period_year=period_year,
            period_month=period_month,
        )

        recommendation_records: List[Dict[str, Any]] = []
        budget_records: List[Dict[str, Any]] = []

        total_req_by_type: Dict[str, int] = {rt["resource_name"]: 0 for rt in resource_types}
        recorded_districts_set = set()

        for d in districts:
            d_id = d["district_id"]
            pop = d["total_population"]
            risk_score = d["overall_risk_score"]
            risk_level = d["risk_level"]
            sev_idx = d["severity_index"]
            trend_idx = d["trend_index"]
            fc_vol = d["forecast_volume"]
            model_id = d["model_id"]

            m_risk = ResourceService.calculate_risk_multiplier(risk_score)

            # Calculate requirements for the 4 resource categories
            q_off = ResourceService.calculate_officer_requirement(pop, m_risk)
            q_veh = ResourceService.calculate_vehicle_requirement(q_off)
            q_inv = ResourceService.calculate_investigation_requirement(fc_vol, sev_idx)
            q_srv = ResourceService.calculate_surveillance_requirement(risk_level, trend_idx)

            req_specs = [
                (
                    rt_officers,
                    q_off,
                    {
                        "formula": "max(5, round((10 + 5 * Pop / 1M) * M_risk))",
                        "population": pop,
                        "risk_score": risk_score,
                        "risk_multiplier": round(m_risk, 4),
                        "base_officers": round(10.0 + 5.0 * (pop / 1_000_000.0), 2),
                    },
                ),
                (
                    rt_vehicles,
                    q_veh,
                    {
                        "formula": "max(2, round(Q_officers / 3.0))",
                        "q_officers": q_off,
                        "vehicle_ratio": 3.0,
                    },
                ),
                (
                    rt_invest,
                    q_inv,
                    {
                        "formula": "max(1, round((ForecastVolume / 2.0) * (SeverityIndex / 1.15)))",
                        "forecast_volume": round(fc_vol, 2),
                        "severity_index": round(sev_idx, 2),
                        "caseload_divisor": 2.0,
                    },
                ),
                (
                    rt_surv,
                    q_srv,
                    {
                        "formula": "BaseTier + TrendBoost (bound 1-8)",
                        "risk_level": risk_level,
                        "trend_index": round(trend_idx, 2),
                    },
                ),
            ]

            for rt_info, q_req, rationale_meta in req_specs:
                rt_id = rt_info["id"]
                rt_name = rt_info["resource_name"]

                total_req_by_type[rt_name] += q_req

                # Check if verified availability exists in district_resources
                avail_key = (d_id, rt_id)
                has_avail = avail_key in availability_map
                avail_qty = availability_map[avail_key] if has_avail else None

                if has_avail:
                    recorded_districts_set.add(d_id)
                    avail_status = "VERIFIED"
                    shortfall = max(q_req - avail_qty, 0)
                    surplus = max(avail_qty - q_req, 0)
                    # Recommended quantity to deploy: shortfall amount
                    recommended_qty = shortfall
                else:
                    avail_status = "UNRECORDED"
                    shortfall = q_req  # Gross demand
                    surplus = 0
                    # Under unconstrained gross demand, recommendation equals full requirement
                    recommended_qty = q_req

                priority_tier = ResourceService.determine_priority_tier(risk_level, shortfall)
                priority_score = ResourceService.calculate_priority_score(risk_score, shortfall, q_req)

                rationale_meta.update({
                    "calculation_version": calculation_version,
                    "availability_status": avail_status,
                    "has_availability_data": has_avail,
                    "priority_tier": priority_tier,
                    "priority_score": priority_score,
                })

                recommendation_records.append({
                    "district_id": d_id,
                    "resource_type_id": rt_id,
                    "period_year": period_year,
                    "period_month": period_month,
                    "required_quantity": q_req,
                    "available_quantity": avail_qty,
                    "recommended_quantity": recommended_qty,
                    "shortfall_quantity": shortfall,
                    "surplus_quantity": surplus,
                    "has_availability_data": 1 if has_avail else 0,
                    "availability_status": avail_status,
                    "priority_tier": priority_tier,
                    "priority_score": priority_score,
                    "optimization_rationale": json.dumps(rationale_meta),
                    "model_id": model_id,
                    "calculation_version": calculation_version,
                })

                # Budget estimation lineage
                cost_info = resource_costs.get(rt_id)
                if cost_info:
                    unit_cost = cost_info["unit_cost"]
                    est_cost = float(recommended_qty) * unit_cost
                    budget_records.append({
                        "district_id": d_id,
                        "resource_type_id": rt_id,
                        "period_year": period_year,
                        "period_month": period_month,
                        "recommended_units": recommended_qty,
                        "unit_cost": unit_cost,
                        "estimated_total_cost": est_cost,
                        "currency": "INR",
                        "cost_config_id": cost_info["cost_config_id"],
                    })

        # 5. Idempotent persistence
        persisted_recs = ResourceRepository.save_recommendations(db, recommendation_records)
        persisted_budgets = ResourceRepository.save_budget_estimations(db, budget_records)

        return {
            "status": "success",
            "assessment_period": assessment_period,
            "calculation_version": calculation_version,
            "total_districts": len(districts),
            "recommendations_persisted": persisted_recs,
            "budget_records_persisted": persisted_budgets,
            "districts_with_recorded_availability": len(recorded_districts_set),
            "districts_with_unrecorded_availability": len(districts) - len(recorded_districts_set),
            "total_required_by_type": total_req_by_type,
        }

    @staticmethod
    def get_overview(
        db: Session,
        assessment_period: str = "2026-01-01",
        calculation_version: str = CALCULATION_VERSION,
    ) -> ResourceOverviewResponse:
        """Computes executive KPIs across all 640 assessed districts for resource-v1.0."""
        try:
            dt = datetime.strptime(assessment_period, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid assessment date format: {assessment_period}. Expected YYYY-MM-DD.",
            )

        # Check if recommendations are generated, if not generate them on the fly idempotently
        count_sql = "SELECT COUNT(*) FROM resource_recommendations WHERE period_year = :py AND period_month = :pm AND calculation_version = :ver"
        from sqlalchemy import text
        existing_count = db.execute(text(count_sql), {"py": dt.year, "pm": dt.month, "ver": calculation_version}).scalar() or 0
        if existing_count < 2560:
            ResourceService.run_resource_optimization(db, assessment_period=assessment_period, calculation_version=calculation_version)

        # Retrieve summary stats
        stat_sql = text("""
            SELECT 
                rt.resource_name,
                SUM(rr.required_quantity) AS total_req,
                SUM(rr.shortfall_quantity) AS total_short,
                SUM(rr.surplus_quantity) AS total_surp,
                SUM(CASE WHEN rr.has_availability_data = 1 THEN 1 ELSE 0 END) AS count_recorded,
                COUNT(*) AS total_records
            FROM resource_recommendations rr
            JOIN resource_types rt ON rr.resource_type_id = rt.id
            WHERE rr.period_year = :py AND rr.period_month = :pm AND rr.calculation_version = :ver
            GROUP BY rt.resource_name
        """)
        rows = db.execute(stat_sql, {"py": dt.year, "pm": dt.month, "ver": calculation_version}).fetchall()

        total_req_by_type: Dict[str, int] = {}
        total_gross_demand = 0
        total_shortfall = 0
        total_surplus = 0
        recorded_count = 0

        for r in rows:
            name = str(r[0])
            req = int(r[1]) if r[1] else 0
            short = int(r[2]) if r[2] else 0
            surp = int(r[3]) if r[3] else 0
            rec = int(r[4]) if r[4] else 0

            total_req_by_type[name] = req
            total_gross_demand += req
            total_shortfall += short
            total_surplus += surp
            recorded_count += rec

        # Priority tier distribution
        p_sql = text("""
            SELECT priority_tier, COUNT(*) 
            FROM resource_recommendations
            WHERE period_year = :py AND period_month = :pm AND calculation_version = :ver
            GROUP BY priority_tier
        """)
        p_rows = db.execute(p_sql, {"py": dt.year, "pm": dt.month, "ver": calculation_version}).fetchall()
        p_dist: Dict[str, int] = {"CRITICAL": 0, "HIGH": 0, "MODERATE": 0, "LOW": 0}
        for pr in p_rows:
            p_dist[str(pr[0])] = int(pr[1])

        # Budget sum
        b_sql = text("""
            SELECT SUM(estimated_total_cost)
            FROM budget_estimations
            WHERE period_year = :py AND period_month = :pm
        """)
        total_budget = db.execute(b_sql, {"py": dt.year, "pm": dt.month}).scalar()
        total_budget_val = float(total_budget) if total_budget else 0.0

        # Top priority districts
        top_items, _ = ResourceRepository.list_recommendations(
            db,
            period_year=dt.year,
            period_month=dt.month,
            calculation_version=calculation_version,
            skip=0,
            limit=10,
        )

        has_any_recorded = recorded_count > 0
        avail_status_str = (
            "VERIFIED - Authorized standing inventories present"
            if has_any_recorded
            else "UNRECORDED - Pending Administrative Inventory Entry"
        )

        return ResourceOverviewResponse(
            assessment_period=assessment_period,
            methodology_version=calculation_version,
            total_assessed_districts=640,
            total_resource_types=len(total_req_by_type),
            availability_data_status=avail_status_str,
            districts_with_recorded_availability=recorded_count // 4,
            districts_with_unrecorded_availability=640 - (recorded_count // 4),
            total_required_by_type=total_req_by_type,
            total_gross_demand=total_gross_demand,
            total_verified_shortfall=total_shortfall if has_any_recorded else None,
            total_verified_surplus=total_surplus if has_any_recorded else None,
            priority_distribution=p_dist,
            allocation_capacity_status="NOT CONFIGURED - Exposing Unconstrained Gross Operational Demand",
            estimated_total_monthly_budget=total_budget_val,
            currency="INR",
            top_priority_districts=[ResourceItemResponse(**item) for item in top_items],
        )

    @staticmethod
    def list_resources(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        resource_type_id: Optional[int] = None,
        priority_tier: Optional[str] = None,
        risk_level: Optional[str] = None,
        assessment_period: str = "2026-01-01",
        calculation_version: str = CALCULATION_VERSION,
        skip: int = 0,
        limit: int = 100,
    ) -> StandardListResponse[ResourceItemResponse]:
        """Queries paginated district resource items with optional filters."""
        try:
            dt = datetime.strptime(assessment_period, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid assessment date format: {assessment_period}. Expected YYYY-MM-DD.",
            )

        items, total = ResourceRepository.list_recommendations(
            db,
            state_id=state_id,
            district_id=district_id,
            resource_type_id=resource_type_id,
            priority_tier=priority_tier,
            risk_level=risk_level,
            period_year=dt.year,
            period_month=dt.month,
            calculation_version=calculation_version,
            skip=skip,
            limit=limit,
        )

        parsed_items = [ResourceItemResponse(**item) for item in items]
        return StandardListResponse(
            items=parsed_items,
            total=total,
            skip=skip,
            limit=limit,
        )

    @staticmethod
    def get_district_detail(
        db: Session,
        district_id: int,
        assessment_period: str = "2026-01-01",
        calculation_version: str = CALCULATION_VERSION,
    ) -> DistrictResourceDetailResponse:
        """Retrieves full explainable profile and schedules for a specific district."""
        try:
            dt = datetime.strptime(assessment_period, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid assessment date format: {assessment_period}. Expected YYYY-MM-DD.",
            )

        detail = ResourceRepository.get_district_detail(
            db,
            district_id=district_id,
            period_year=dt.year,
            period_month=dt.month,
            calculation_version=calculation_version,
        )
        if not detail:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resource recommendations for district ID {district_id} at period {assessment_period} not found.",
            )

        return DistrictResourceDetailResponse(**detail)

    @staticmethod
    def get_methodology_info(db: Session) -> ResourceModelInfoResponse:
        """Returns frozen methodology metadata, equations, resource types, and governance notes."""
        resource_types = ResourceRepository.get_active_resource_types(db)
        costs = ResourceRepository.get_active_resource_costs(db)

        enriched_types = []
        for rt in resource_types:
            rt_id = rt["id"]
            cost_info = costs.get(rt_id, {})
            enriched_types.append({
                "id": rt_id,
                "resource_name": rt["resource_name"],
                "unit_of_measure": rt["unit_of_measure"],
                "description": rt["description"],
                "unit_cost_inr": cost_info.get("unit_cost"),
                "billing_period": "Monthly",
            })

        return ResourceModelInfoResponse(
            methodology_version=CALCULATION_VERSION,
            assessment_period="2026-01-01",
            formula_summary={
                "risk_multiplier": "M_risk(d) = OverallRiskScore_d / 50.00",
                "police_officers": "max(5, round((10 + 5 * Population / 1,000,000) * M_risk))",
                "patrol_vehicles": "max(2, round(Q_officers / 3.0))",
                "investigation_teams": "max(1, round((ForecastVolume / 2.0) * (SeverityIndex / 1.15)))",
                "surveillance_units": "BaseTier(RiskLevel) + TrendBoost(TrendIndex) [bound 1-8]",
                "shortfall": "max(required - available, 0) [when verified] | required [gross demand when unrecorded]",
                "priority_score": "OverallRiskScore * (0.70 + 0.30 * shortfall / max(required, 1))",
            },
            resource_types=enriched_types,
            priority_tiers={
                "CRITICAL": "Risk Level == CRITICAL AND Shortfall > 0",
                "HIGH": "Risk Level == HIGH AND Shortfall > 0",
                "MODERATE": "Risk Level == MODERATE AND Shortfall > 0",
                "LOW": "Risk Level == LOW OR Shortfall == 0",
            },
            availability_data_status="UNRECORDED - Standing district asset inventories are currently unrecorded in source data. System operates cleanly in gross-demand mode without fabricating fake inventories.",
            allocation_capacity_status="NOT CONFIGURED - Exposing unconstrained operational demand. Optional capacity simulator available via /allocate endpoint.",
            notes=[
                "Resource optimization is a deterministic decision-support layer, not an autonomous deployment order.",
                "Victim demographics (age, gender, community) are strictly excluded from all equations.",
                "Historical incident response counts (police_deployed_count) are strictly excluded from standing inventory.",
                "All budgetary calculations use statutory unit costs configured in resource_costs.",
            ],
        )

    @staticmethod
    def simulate_constrained_allocation(
        db: Session,
        resource_type_id: int,
        pool_capacity: int,
        assessment_period: str = "2026-01-01",
        calculation_version: str = CALCULATION_VERSION,
    ) -> ResourceAllocationSimulationResponse:
        """
        Executes Greedy Tiered Priority Allocation under an administrative capacity constraint pool C_r.
        Filters districts with shortfall > 0, ranks by (Priority Tier, Priority Score DESC),
        and allocates resources until pool is exhausted.
        """
        if pool_capacity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pool capacity must be greater than zero.",
            )

        try:
            dt = datetime.strptime(assessment_period, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid assessment date format: {assessment_period}. Expected YYYY-MM-DD.",
            )

        # Retrieve resource type name
        all_types = ResourceRepository.get_active_resource_types(db)
        rt_match = next((rt for rt in all_types if rt["id"] == resource_type_id), None)
        if not rt_match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resource type ID {resource_type_id} not found.",
            )

        # Retrieve all candidate recommendations for this resource type
        items, _ = ResourceRepository.list_recommendations(
            db,
            resource_type_id=resource_type_id,
            period_year=dt.year,
            period_month=dt.month,
            calculation_version=calculation_version,
            skip=0,
            limit=1000,
        )

        tier_rank_map = {"CRITICAL": 1, "HIGH": 2, "MODERATE": 3, "LOW": 4}
        # Filter for positive shortfall and sort by tier rank then priority score descending
        candidates = [item for item in items if item["shortfall_quantity"] > 0]
        candidates.sort(
            key=lambda x: (
                tier_rank_map.get(x["priority_tier"].upper(), 99),
                -x["priority_score"],
                -x["shortfall_quantity"],
            )
        )

        remaining_pool = pool_capacity
        allocated_total = 0
        fully_satisfied = 0
        partially_satisfied = 0
        unmet = 0
        allocations: List[AllocationItem] = []

        for c in candidates:
            sf = c["shortfall_quantity"]
            alloc = min(sf, remaining_pool)
            remaining_pool -= alloc
            allocated_total += alloc
            unmet_sf = sf - alloc

            if alloc == sf:
                fully_satisfied += 1
            elif alloc > 0:
                partially_satisfied += 1
            else:
                unmet += 1

            allocations.append(
                AllocationItem(
                    district_id=c["district_id"],
                    district_name=c["district_name"],
                    state_name=c["state_name"],
                    priority_tier=c["priority_tier"],
                    priority_score=c["priority_score"],
                    risk_score=c["risk_score"],
                    shortfall=sf,
                    allocated_quantity=alloc,
                    unmet_shortfall=unmet_sf,
                )
            )

        return ResourceAllocationSimulationResponse(
            resource_type_id=resource_type_id,
            resource_name=rt_match["resource_name"],
            pool_capacity=pool_capacity,
            allocated_total=allocated_total,
            remaining_pool=remaining_pool,
            fully_satisfied_districts=fully_satisfied,
            partially_satisfied_districts=partially_satisfied,
            unmet_districts=unmet,
            allocations=allocations,
        )

    @staticmethod
    def list_state_resources(
        db: Session,
        state_id: Optional[int] = None,
        resource_type_id: Optional[int] = None,
        reference_year: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> StandardListResponse[StateResourceItemResponse]:
        """
        Lists official state-level police resources with pagination and filters.
        """
        items, total = ResourceRepository.get_state_resources(
            db,
            state_id=state_id,
            resource_type_id=resource_type_id,
            reference_year=reference_year,
            skip=skip,
            limit=limit,
        )
        pydantic_items = [StateResourceItemResponse(**item) for item in items]
        return StandardListResponse(
            items=pydantic_items,
            total=total,
            skip=skip,
            limit=limit,
        )

    @staticmethod
    def get_coverage(db: Session) -> ResourceCoverageResponse:
        """
        Retrieves official resource coverage statistics across active states and categories.
        """
        cov_data = ResourceRepository.get_resource_coverage(db)
        return ResourceCoverageResponse(
            total_active_states=cov_data["total_active_states"],
            total_state_resource_records=cov_data["total_state_resource_records"],
            geography_level=cov_data["geography_level"],
            total_districts=cov_data.get("total_districts", 640),
            districts_with_official_data=cov_data.get("districts_with_official_data", 18),
            districts_with_unrecorded_data=cov_data.get("districts_with_unrecorded_data", 622),
            category_summary=cov_data.get("category_summary"),
            categories=[CategoryCoverageDetail(**c) for c in cov_data["categories"]],
            methodology_notes=cov_data["methodology_notes"],
        )

    @staticmethod
    def list_district_resources(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        category: Optional[str] = None,
        resource_type_id: Optional[int] = None,
        data_status: Optional[str] = None,
        reference_year: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> StandardListResponse[DistrictResourceItemResponse]:
        """Lists district-level resource inventories with verified badges and filters."""
        items, total = ResourceRepository.list_district_resources(
            db,
            state_id=state_id,
            district_id=district_id,
            category=category,
            resource_type_id=resource_type_id,
            data_status=data_status,
            reference_year=reference_year,
            skip=skip,
            limit=limit,
        )
        return StandardListResponse(
            items=[DistrictResourceItemResponse(**item) for item in items],
            total=total,
            skip=skip,
            limit=limit,
        )

    @staticmethod
    def get_district_multi_detail(db: Session, district_id: int) -> List[DistrictResourceItemResponse]:
        """Retrieves complete multi-category resource breakdown for a specific district."""
        items = ResourceRepository.get_district_resource_detail_multi(db, district_id=district_id)
        if not items:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No resource inventory found for district ID {district_id}",
            )
        return [DistrictResourceItemResponse(**item) for item in items]

    @staticmethod
    def list_categories(db: Session) -> List[ResourceCategoryDetailResponse]:
        """Retrieves all operational resource categories and constituent types."""
        categories = ResourceRepository.get_categories(db)
        return [ResourceCategoryDetailResponse(**c) for c in categories]

    @staticmethod
    def list_resource_gaps(
        db: Session,
        state_id: Optional[int] = None,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> StandardListResponse[DistrictResourceGapResponse]:
        """Retrieves comparative actual vs required resource gaps."""
        items, total = ResourceRepository.get_resource_gaps(
            db,
            state_id=state_id,
            category=category,
            skip=skip,
            limit=limit,
        )
        return StandardListResponse(
            items=[DistrictResourceGapResponse(**item) for item in items],
            total=total,
            skip=skip,
            limit=limit,
        )

    @staticmethod
    def list_ai_recommendations(
        db: Session,
        state_id: Optional[int] = None,
        priority_tier: Optional[str] = None,
        risk_level: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> StandardListResponse[AIResourceRecommendationResponse]:
        """Retrieves district AI resource recommendations with priority tiers and explanations."""
        items, total = ResourceRepository.get_ai_recommendations(
            db,
            state_id=state_id,
            priority_tier=priority_tier,
            risk_level=risk_level,
            skip=skip,
            limit=limit,
        )
        return StandardListResponse(
            items=[AIResourceRecommendationResponse(**item) for item in items],
            total=total,
            skip=skip,
            limit=limit,
        )

    @staticmethod
    def list_category_resources(
        db: Session,
        category: str,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        data_status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> StandardListResponse[DistrictResourceItemResponse]:
        """Helper to list resources specifically under a given category."""
        return ResourceService.list_district_resources(
            db,
            state_id=state_id,
            district_id=district_id,
            category=category,
            data_status=data_status,
            skip=skip,
            limit=limit,
        )


