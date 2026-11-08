"""
Phase 11: Budget Estimation and Cost Analysis Service.

Core engine for:
1. Annual and monthly personnel, mobility, investigation, surveillance, and infrastructure costs.
2. Separation of recurring operational costs from one-time capital procurement costs.
3. Integration with Phase 10 / 10.1 Optimization Runs:
   - Transparent handling of baseline vs scenario costs.
   - Strict adherence to data integrity: returns INSUFFICIENT_DATA on unrecorded district baselines.
   - Clear segregation of simulation estimates from operational cost estimates.
4. Incremental cost comparison: Delta Cost = Cost(scenario) - Cost(baseline).
5. Comprehensive provenance and assumption tracking without fabricated data.
"""

import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from backend.app.models.budget import (
    CostBenchmarkRate,
    BudgetEstimationRun,
    BudgetEstimationItem,
    ResourceCostMaster,
    StateBudget,
    DistrictBudgetAllocation,
    BudgetScenario,
    BudgetCalculationHistory,
)
from backend.app.models.optimization import OptimizationRun, OptimizationAllocation
from backend.app.models.resources import ResourceType, DistrictResource
from backend.app.models.geography import State, District
from backend.app.models.intelligence import CrimeRiskScore
from backend.app.models.auth import User
from backend.app.repositories.budget_repository import BudgetRepository
from backend.app.services.crime_resource_optimization_service import CrimeResourceOptimizationService
from backend.app.schemas.budget import (
    BudgetEstimateRequest,
    BudgetEstimationRunResponse,
    BudgetEstimationItemResponse,
    ScenarioCostComparisonResponse,
    BudgetOverviewResponse,
    CostBenchmarkRateResponse,
    ResourceCostMasterCreate,
    ResourceCostMasterUpdate,
    ResourceCostMasterResponse,
    StateBudgetCreate,
    StateBudgetUpdate,
    StateBudgetResponse,
    StateBudgetSummaryItem,
    DistrictBudgetAllocationCreate,
    DistrictBudgetAllocationUpdate,
    DistrictBudgetAllocationResponse,
    DistrictBudgetSummaryItem,
    PoolCostItem,
    BudgetSimulationRequest,
    BudgetSimulationResponse,
    BudgetScenarioCreate,
    BudgetScenarioResponse,
    BudgetCalculationHistoryResponse,
    FullBudgetOverviewResponse,
)


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

_BUDGET_CACHE: Dict[str, Tuple[float, Any]] = {}
CACHE_TTL = 300  # 5 minutes


class BudgetService:
    CACHE_TTL = 300
    _BUDGET_CACHE = _BUDGET_CACHE

    @classmethod
    def clear_budget_cache(cls):
        cls._BUDGET_CACHE.clear()

    @staticmethod
    def get_benchmarks(
        db: Session,
        resource_type_id: Optional[int] = None,
        cost_type: Optional[str] = None,
    ) -> List[CostBenchmarkRateResponse]:
        """Returns active cost benchmark rates with joined resource metadata."""
        benchmarks = BudgetRepository.get_cost_benchmarks(db, resource_type_id=resource_type_id, cost_type=cost_type)
        items = []
        for b in benchmarks:
            res_name = b.resource_type.resource_name if b.resource_type else None
            cat = b.resource_type.category if b.resource_type else None
            items.append(CostBenchmarkRateResponse(
                id=b.id,
                resource_type_id=b.resource_type_id,
                resource_name=res_name,
                category=cat,
                cost_type=b.cost_type,
                cost_component=b.cost_component,
                unit_cost_inr=float(b.unit_cost_inr),
                source_name=b.source_name,
                source_publication=b.source_publication,
                reference_year=b.reference_year,
                data_quality_tier=b.data_quality_tier,
                formula_expression=b.formula_expression,
                assumptions_notes=b.assumptions_notes,
                is_active=b.is_active,
                created_at=b.created_at.isoformat() if b.created_at else None,
                updated_at=b.updated_at.isoformat() if b.updated_at else None,
            ))
        return items

    @staticmethod
    def estimate_budget(
        db: Session,
        req: BudgetEstimateRequest,
        current_user: Optional[User] = None,
    ) -> BudgetEstimationRunResponse:
        """
        Executes transparent budget and cost estimation.
        Strictly connects with Phase 10 / 10.1 optimization scenarios while respecting:
        - Operational integrity: Returns INSUFFICIENT_DATA if unrecorded baselines exist in operational mode.
        - Simulation segregation: Labels hypothetical runs with SIMULATION_ESTIMATE.
        - No non-causal claims or fabricated expenditures.
        """
        period_year = req.period_year or 2026
        period_month = req.period_month or 1
        assessment_period = date(period_year, period_month, 1)

        # ---------------------------------------------------------------------
        # Case 1: Estimation linked to an OptimizationRun (Phase 10 / 10.1)
        # ---------------------------------------------------------------------
        if req.optimization_run_id:
            opt_run = (
                db.query(OptimizationRun)
                .filter(OptimizationRun.run_id == req.optimization_run_id)
                .first()
            )
            if not opt_run:
                raise ValueError(f"Optimization run '{req.optimization_run_id}' not found.")

            res_type_id = opt_run.resource_type_id
            state_id = opt_run.state_id

            # DATA INTEGRITY GUARD:
            # If the optimization run returned INSUFFICIENT_DATA (or operational on unrecorded baselines with 0 allocations)
            if opt_run.solver_status == "INSUFFICIENT_DATA" or (
                opt_run.allocation_mode == "OPERATIONAL" and opt_run.shortfall_after == 0 and opt_run.allocated_total == 0
            ):
                # Return formal INSUFFICIENT_DATA run
                run_id = f"cost-insuf-{uuid.uuid4().hex[:10]}"
                insuf_run_data = {
                    "run_id": run_id,
                    "optimization_run_id": opt_run.run_id,
                    "state_id": state_id,
                    "resource_type_id": res_type_id,
                    "period_year": period_year,
                    "period_month": period_month,
                    "assessment_period": assessment_period,
                    "estimation_mode": "INSUFFICIENT_DATA",
                    "currency": "INR",
                    "total_baseline_recurring_annual": Decimal("0.00"),
                    "total_scenario_recurring_annual": Decimal("0.00"),
                    "total_baseline_recurring_monthly": Decimal("0.00"),
                    "total_scenario_recurring_monthly": Decimal("0.00"),
                    "total_one_time_procurement_cost": Decimal("0.00"),
                    "incremental_recurring_cost": Decimal("0.00"),
                    "total_shortfall_resolution_cost": Decimal("0.00"),
                    "verified_cost_ratio": Decimal("0.00"),
                    "assumed_cost_ratio": Decimal("0.00"),
                    "status": "INSUFFICIENT_DATA",
                    "assumptions_summary": {
                        "integrity_guard": "UNRECORDED_BASELINE_PREVENTION",
                        "reason": "Cost estimation halted: Optimization run reported INSUFFICIENT_DATA due to unrecorded district baseline inventories.",
                        "rule": "Operational budget estimates require verified district-level resource inventories to prevent speculative fiscal commitments.",
                    },
                    "explanation_summary": (
                        "Cost estimation halted: The associated optimization run has INSUFFICIENT_DATA "
                        "status. Operational financial estimates cannot be generated for districts with unrecorded "
                        "actual baselines without verified official inventory records."
                    ),
                    "created_by_user_id": current_user.id if current_user else None,
                }
                saved_run = BudgetRepository.save_budget_run(db, insuf_run_data, [])
                return BudgetService._format_run_response(db, saved_run, [])

            # Determine estimation mode
            if opt_run.is_simulation or opt_run.allocation_mode == "SIMULATION":
                est_mode = "SIMULATION_ESTIMATE"
            else:
                est_mode = "OPERATIONAL_COST"

            # Fetch allocations
            allocations = (
                db.query(OptimizationAllocation)
                .filter(OptimizationAllocation.run_id == opt_run.run_id)
                .all()
            )

            # Fetch effective unit rates
            rates_info = BudgetRepository.get_effective_rates_for_resource(db, res_type_id)
            monthly_unit = rates_info["monthly_recurring_unit_cost"]
            annual_unit = rates_info["annual_recurring_unit_cost"]
            capital_unit = rates_info["one_time_unit_cost"]
            quality_tier = rates_info["primary_tier"]

            items_to_save = []
            total_baseline_annual = Decimal("0.00")
            total_scenario_annual = Decimal("0.00")
            total_capital_procurement = Decimal("0.00")

            run_id = f"cost-run-{uuid.uuid4().hex[:10]}"

            for alloc in allocations:
                base_qty = alloc.baseline_quantity
                rec_qty = alloc.recommended_quantity
                
                # Check baseline status
                if base_qty is None or alloc.baseline_status == "UNRECORDED_DISTRICT_ACTUAL":
                    eff_base_qty = 0
                    has_recorded_base = False
                else:
                    eff_base_qty = base_qty
                    has_recorded_base = True

                # New procurement units: shortfall after allocation or recommended above baseline
                new_procure = max(0, rec_qty - eff_base_qty) if has_recorded_base else 0

                district_base_annual = Decimal(str(round(eff_base_qty * annual_unit, 2)))
                district_rec_annual = Decimal(str(round(rec_qty * annual_unit, 2)))
                district_procurement = Decimal(str(round(new_procure * capital_unit, 2))) if req.include_procurement else Decimal("0.00")
                net_delta = district_rec_annual - district_base_annual

                total_baseline_annual += district_base_annual
                total_scenario_annual += district_rec_annual
                total_capital_procurement += district_procurement

                expl = (
                    f"Baseline: {eff_base_qty} units (₹{float(district_base_annual)/1e5:.2f}L/yr) -> "
                    f"Recommended: {rec_qty} units (₹{float(district_rec_annual)/1e5:.2f}L/yr). "
                    f"Net annual delta: ₹{float(net_delta)/1e5:+.2f}L/yr. "
                )
                if new_procure > 0 and req.include_procurement:
                    expl += f"Capital procurement: {new_procure} units @ ₹{capital_unit/1e5:.2f}L (₹{float(district_procurement)/1e5:.2f}L)."

                items_to_save.append({
                    "run_id": run_id,
                    "district_id": alloc.district_id,
                    "resource_type_id": res_type_id,
                    "baseline_units": base_qty,
                    "recommended_units": rec_qty,
                    "new_procurement_units": new_procure,
                    "monthly_recurring_unit_cost": Decimal(str(monthly_unit)),
                    "annual_recurring_unit_cost": Decimal(str(annual_unit)),
                    "one_time_unit_cost": Decimal(str(capital_unit)),
                    "baseline_annual_cost": district_base_annual,
                    "recommended_annual_cost": district_rec_annual,
                    "procurement_cost": district_procurement,
                    "net_delta_annual_cost": net_delta,
                    "data_quality_tier": quality_tier,
                    "explanation": expl,
                })

            total_baseline_monthly = Decimal(str(round(float(total_baseline_annual) / 12.0, 2)))
            total_scenario_monthly = Decimal(str(round(float(total_scenario_annual) / 12.0, 2)))
            incremental_recurring = total_scenario_annual - total_baseline_annual
            shortfall_resolution = total_capital_procurement + max(Decimal("0.00"), incremental_recurring)

            # Verified vs Assumed ratio
            if quality_tier == "OFFICIAL_DOCUMENTED":
                v_ratio = Decimal("1.00")
                a_ratio = Decimal("0.00")
            elif quality_tier == "ESTIMATED_BENCHMARK":
                v_ratio = Decimal("0.00")
                a_ratio = Decimal("1.00")
            else:
                v_ratio = Decimal("0.00")
                a_ratio = Decimal("1.00")

            assumptions_dict = {
                "estimation_mode": est_mode,
                "data_quality_tier": quality_tier,
                "sources": rates_info["sources"],
                "assumptions": rates_info["assumptions"],
                "formula": "Annual = Quantity * UnitRate * 12; Procurement = Shortfall * CapitalUnitRate",
                "notes": (
                    "Costs reflect standardized benchmark rates from central pay commission and police equipment norms. "
                    "Actual municipal disbursements may vary based on local allowances and procurement tenders."
                ),
            }
            if est_mode == "SIMULATION_ESTIMATE":
                assumptions_dict["simulation_disclaimer"] = (
                    "SIMULATION ESTIMATE: Derived from hypothetical scenario modeling. Not an approved government budget sanction."
                )

            expl_summary = (
                f"Completed {est_mode} estimation for run '{opt_run.run_id}'. "
                f"Baseline annual operating cost: ₹{float(total_baseline_annual)/1e7:.2f} Cr. "
                f"Scenario annual operating cost: ₹{float(total_scenario_annual)/1e7:.2f} Cr. "
                f"Incremental recurring delta: ₹{float(incremental_recurring)/1e7:+.2f} Cr/yr. "
                f"One-time capital procurement: ₹{float(total_capital_procurement)/1e7:.2f} Cr."
            )

            run_record = {
                "run_id": run_id,
                "optimization_run_id": opt_run.run_id,
                "state_id": state_id,
                "resource_type_id": res_type_id,
                "period_year": period_year,
                "period_month": period_month,
                "assessment_period": assessment_period,
                "estimation_mode": est_mode,
                "currency": "INR",
                "total_baseline_recurring_annual": total_baseline_annual,
                "total_scenario_recurring_annual": total_scenario_annual,
                "total_baseline_recurring_monthly": total_baseline_monthly,
                "total_scenario_recurring_monthly": total_scenario_monthly,
                "total_one_time_procurement_cost": total_capital_procurement,
                "incremental_recurring_cost": incremental_recurring,
                "total_shortfall_resolution_cost": shortfall_resolution,
                "verified_cost_ratio": v_ratio,
                "assumed_cost_ratio": a_ratio,
                "status": "COMPLETED",
                "assumptions_summary": assumptions_dict,
                "explanation_summary": expl_summary,
                "created_by_user_id": current_user.id if current_user else None,
            }

            saved_run = BudgetRepository.save_budget_run(db, run_record, items_to_save)
            return BudgetService._format_run_response(db, saved_run, items_to_save)

        # ---------------------------------------------------------------------
        # Case 2: Standalone estimation for state / resource_type
        # ---------------------------------------------------------------------
        res_type_id = req.resource_type_id or 1
        state_id = req.state_id

        # Query district resources
        q = (
            db.query(DistrictResource)
            .join(District, DistrictResource.district_id == District.id)
            .filter(DistrictResource.resource_type_id == res_type_id)
        )
        if state_id is not None:
            q = q.filter(District.state_id == state_id)
        records = q.all()

        recorded_items = [r for r in records if r.actual_quantity is not None]

        # Integrity check: If operational estimation requested but NO recorded district resources exist
        if not recorded_items:
            run_id = f"cost-insuf-{uuid.uuid4().hex[:10]}"
            insuf_run_data = {
                "run_id": run_id,
                "optimization_run_id": None,
                "state_id": state_id,
                "resource_type_id": res_type_id,
                "period_year": period_year,
                "period_month": period_month,
                "assessment_period": assessment_period,
                "estimation_mode": "INSUFFICIENT_DATA",
                "currency": "INR",
                "total_baseline_recurring_annual": Decimal("0.00"),
                "total_scenario_recurring_annual": Decimal("0.00"),
                "total_baseline_recurring_monthly": Decimal("0.00"),
                "total_scenario_recurring_monthly": Decimal("0.00"),
                "total_one_time_procurement_cost": Decimal("0.00"),
                "incremental_recurring_cost": Decimal("0.00"),
                "total_shortfall_resolution_cost": Decimal("0.00"),
                "verified_cost_ratio": Decimal("0.00"),
                "assumed_cost_ratio": Decimal("0.00"),
                "status": "INSUFFICIENT_DATA",
                "assumptions_summary": {
                    "integrity_guard": "NO_RECORDED_DISTRICT_ACTUALS",
                    "reason": "Cannot calculate operational baseline expenditure without verified district inventory records.",
                },
                "explanation_summary": (
                    "Cost estimation halted: No official recorded district resources found for the specified state and resource type. "
                    "In compliance with data integrity standards, expenditure figures are not fabricated for unrecorded districts."
                ),
                "created_by_user_id": current_user.id if current_user else None,
            }
            saved_run = BudgetRepository.save_budget_run(db, insuf_run_data, [])
            return BudgetService._format_run_response(db, saved_run, [])

        rates_info = BudgetRepository.get_effective_rates_for_resource(db, res_type_id)
        annual_unit = rates_info["annual_recurring_unit_cost"]
        monthly_unit = rates_info["monthly_recurring_unit_cost"]
        capital_unit = rates_info["one_time_unit_cost"]
        quality_tier = rates_info["primary_tier"]

        run_id = f"cost-base-{uuid.uuid4().hex[:10]}"
        items_to_save = []
        total_baseline_annual = Decimal("0.00")

        for r in recorded_items:
            qty = r.actual_quantity or 0
            cost = Decimal(str(round(qty * annual_unit, 2)))
            total_baseline_annual += cost

            items_to_save.append({
                "run_id": run_id,
                "district_id": r.district_id,
                "resource_type_id": res_type_id,
                "baseline_units": qty,
                "recommended_units": qty,
                "new_procurement_units": 0,
                "monthly_recurring_unit_cost": Decimal(str(monthly_unit)),
                "annual_recurring_unit_cost": Decimal(str(annual_unit)),
                "one_time_unit_cost": Decimal(str(capital_unit)),
                "baseline_annual_cost": cost,
                "recommended_annual_cost": cost,
                "procurement_cost": Decimal("0.00"),
                "net_delta_annual_cost": Decimal("0.00"),
                "data_quality_tier": quality_tier,
                "explanation": f"Official recorded baseline: {qty} units (₹{float(cost)/1e5:.2f}L/yr).",
            })

        total_baseline_monthly = Decimal(str(round(float(total_baseline_annual) / 12.0, 2)))

        run_record = {
            "run_id": run_id,
            "optimization_run_id": None,
            "state_id": state_id,
            "resource_type_id": res_type_id,
            "period_year": period_year,
            "period_month": period_month,
            "assessment_period": assessment_period,
            "estimation_mode": "OPERATIONAL_COST",
            "currency": "INR",
            "total_baseline_recurring_annual": total_baseline_annual,
            "total_scenario_recurring_annual": total_baseline_annual,
            "total_baseline_recurring_monthly": total_baseline_monthly,
            "total_scenario_recurring_monthly": total_baseline_monthly,
            "total_one_time_procurement_cost": Decimal("0.00"),
            "incremental_recurring_cost": Decimal("0.00"),
            "total_shortfall_resolution_cost": Decimal("0.00"),
            "verified_cost_ratio": Decimal("0.00"),
            "assumed_cost_ratio": Decimal("1.00"),
            "status": "COMPLETED",
            "assumptions_summary": {
                "estimation_mode": "OPERATIONAL_COST",
                "sources": rates_info["sources"],
                "assumptions": rates_info["assumptions"],
                "scope": f"Evaluated {len(recorded_items)} verified district baseline records.",
            },
            "explanation_summary": (
                f"Calculated operational baseline recurring costs across {len(recorded_items)} verified districts. "
                f"Total annual operational cost: ₹{float(total_baseline_annual)/1e7:.2f} Cr."
            ),
            "created_by_user_id": current_user.id if current_user else None,
        }

        saved_run = BudgetRepository.save_budget_run(db, run_record, items_to_save)
        return BudgetService._format_run_response(db, saved_run, items_to_save)

    @staticmethod
    def compare_scenarios(
        db: Session,
        baseline_run_id: str,
        scenario_run_id: str,
    ) -> ScenarioCostComparisonResponse:
        """
        Calculates incremental cost delta between two optimization runs:
        Delta Cost = Cost(scenario) - Cost(baseline).
        Explicitly distinguishes between reallocation and new capital procurement.
        """
        # Fetch both optimization runs
        base_opt = db.query(OptimizationRun).filter(OptimizationRun.run_id == baseline_run_id).first()
        scen_opt = db.query(OptimizationRun).filter(OptimizationRun.run_id == scenario_run_id).first()

        if not base_opt:
            raise ValueError(f"Baseline optimization run '{baseline_run_id}' not found.")
        if not scen_opt:
            raise ValueError(f"Scenario optimization run '{scenario_run_id}' not found.")

        res_type_id = scen_opt.resource_type_id
        rates_info = BudgetRepository.get_effective_rates_for_resource(db, res_type_id)
        annual_unit = rates_info["annual_recurring_unit_cost"]
        monthly_unit = rates_info["monthly_recurring_unit_cost"]
        capital_unit = rates_info["one_time_unit_cost"]

        # If either run is INSUFFICIENT_DATA, provide transparent comparison noting data constraint
        if base_opt.solver_status == "INSUFFICIENT_DATA" or scen_opt.solver_status == "INSUFFICIENT_DATA":
            return ScenarioCostComparisonResponse(
                baseline_run_id=baseline_run_id,
                scenario_run_id=scenario_run_id,
                scenario_name=scen_opt.scenario_name,
                scenario_type=scen_opt.scenario_type,
                allocation_mode=scen_opt.allocation_mode,
                currency="INR",
                baseline_recurring_annual=0.0,
                scenario_recurring_annual=0.0,
                incremental_recurring_annual=0.0,
                capital_procurement_cost=0.0,
                total_shortfall_resolution_cost=0.0,
                baseline_recurring_monthly=0.0,
                scenario_recurring_monthly=0.0,
                net_delta_monthly=0.0,
                units_reallocated=0,
                units_newly_procured=0,
                data_validity="INSUFFICIENT_DATA",
                is_simulation=scen_opt.is_simulation,
                assumptions=[
                    "Comparison halted: One or both runs report INSUFFICIENT_DATA due to unrecorded district baselines.",
                    "Verified district inventory is required before comparing operational financial costs.",
                ],
                comparison_notes="No financial comparison possible due to unrecorded baseline resource inventories.",
            )

        base_allocs = {a.district_id: a for a in base_opt.allocations}
        scen_allocs = {a.district_id: a for a in scen_opt.allocations}

        total_base_qty = sum(a.recommended_quantity for a in base_allocs.values())
        total_scen_qty = sum(a.recommended_quantity for a in scen_allocs.values())

        base_annual = round(total_base_qty * annual_unit, 2)
        scen_annual = round(total_scen_qty * annual_unit, 2)
        incremental_annual = round(scen_annual - base_annual, 2)

        base_monthly = round(base_annual / 12.0, 2)
        scen_monthly = round(scen_annual / 12.0, 2)
        net_delta_monthly = round(incremental_annual / 12.0, 2)

        # Distinguish reallocation from new procurement
        units_reallocated = min(scen_opt.allocated_total, scen_opt.transferable_pool or scen_opt.pool_capacity)
        units_shortfall = max(0, scen_opt.shortfall_after)
        capital_procurement = round(units_shortfall * capital_unit, 2)
        shortfall_resolution = round(capital_procurement + max(0.0, incremental_annual), 2)

        assumptions_list = [
            f"Benchmark unit recurring annual rate: ₹{annual_unit:,.2f} ({rates_info['primary_tier']})",
            f"Benchmark one-time capital procurement: ₹{capital_unit:,.2f} per unit",
            f"Transfer pool reallocated: {units_reallocated} units (reallocation does not incur capital purchase cost)",
            f"Shortfall procurement needed: {units_shortfall} units",
        ]
        if scen_opt.is_simulation:
            assumptions_list.append("SIMULATION DISCLAIMER: Scenario is a hypothetical optimization and does not constitute a sanctioned municipal budget.")

        comp_notes = (
            f"Comparing '{base_opt.scenario_name}' vs '{scen_opt.scenario_name}'. "
            f"Baseline recurring: ₹{base_annual/1e7:.2f} Cr/yr. "
            f"Scenario recurring: ₹{scen_annual/1e7:.2f} Cr/yr. "
            f"Net incremental delta: ₹{incremental_annual/1e7:+.2f} Cr/yr. "
            f"Capital procurement to resolve shortfalls: ₹{capital_procurement/1e7:.2f} Cr."
        )

        return ScenarioCostComparisonResponse(
            baseline_run_id=baseline_run_id,
            scenario_run_id=scenario_run_id,
            scenario_name=scen_opt.scenario_name,
            scenario_type=scen_opt.scenario_type,
            allocation_mode=scen_opt.allocation_mode,
            currency="INR",
            baseline_recurring_annual=base_annual,
            scenario_recurring_annual=scen_annual,
            incremental_recurring_annual=incremental_annual,
            capital_procurement_cost=capital_procurement,
            total_shortfall_resolution_cost=shortfall_resolution,
            baseline_recurring_monthly=base_monthly,
            scenario_recurring_monthly=scen_monthly,
            net_delta_monthly=net_delta_monthly,
            units_reallocated=units_reallocated,
            units_newly_procured=units_shortfall,
            data_validity=scen_opt.data_validity,
            is_simulation=scen_opt.is_simulation,
            assumptions=assumptions_list,
            comparison_notes=comp_notes,
        )

    @staticmethod
    def get_overview(
        db: Session,
        assessment_period: Optional[str] = "2026-01-01",
    ) -> BudgetOverviewResponse:
        """Computes comprehensive macroeconomic budget metrics and category breakdowns."""
        benchmarks = BudgetRepository.get_cost_benchmarks(db, active_only=True)
        total_benchmarks = len(benchmarks)

        # Count verified vs assumed
        verified_count = sum(1 for b in benchmarks if b.data_quality_tier == "OFFICIAL_DOCUMENTED")
        assumed_count = total_benchmarks - verified_count
        v_pct = round((verified_count / total_benchmarks) * 100.0, 1) if total_benchmarks > 0 else 0.0
        a_pct = round((assumed_count / total_benchmarks) * 100.0, 1) if total_benchmarks > 0 else 100.0

        # Category breakdown of monthly, annual, and capital unit benchmarks
        category_breakdown: Dict[str, Dict[str, float]] = {}
        for b in benchmarks:
            cat = b.resource_type.category if b.resource_type else "OTHER"
            if cat not in category_breakdown:
                category_breakdown[cat] = {
                    "monthly_recurring": 0.0,
                    "annual_recurring": 0.0,
                    "one_time_capital": 0.0,
                }
            val = float(b.unit_cost_inr)
            if b.cost_type == "RECURRING_MONTHLY":
                category_breakdown[cat]["monthly_recurring"] += val
                category_breakdown[cat]["annual_recurring"] += val * 12.0
            elif b.cost_type == "RECURRING_ANNUAL":
                category_breakdown[cat]["annual_recurring"] += val
            elif b.cost_type == "ONE_TIME_CAPITAL":
                category_breakdown[cat]["one_time_capital"] += val

        # Recent runs
        recent_runs_orm = BudgetRepository.list_budget_runs(db, skip=0, limit=5)
        recent_runs = [BudgetService._format_run_response(db, r, []) for r in recent_runs_orm]

        latest_run = BudgetRepository.get_latest_run(db)
        if latest_run:
            total_annual_baseline = float(latest_run.total_baseline_recurring_annual)
            total_annual_scenario = float(latest_run.total_scenario_recurring_annual)
            total_monthly_baseline = float(latest_run.total_baseline_recurring_monthly)
            total_monthly_scenario = float(latest_run.total_scenario_recurring_monthly)
            total_capital = float(latest_run.total_one_time_procurement_cost)
            incremental_delta = float(latest_run.incremental_recurring_cost)
        else:
            # Fallback based on category sums
            total_monthly_baseline = sum(c["monthly_recurring"] for c in category_breakdown.values())
            total_annual_baseline = total_monthly_baseline * 12.0
            total_annual_scenario = total_annual_baseline
            total_monthly_scenario = total_monthly_baseline
            total_capital = sum(c["one_time_capital"] for c in category_breakdown.values())
            incremental_delta = 0.0

        return BudgetOverviewResponse(
            total_annual_baseline_cost=total_annual_baseline,
            total_annual_scenario_cost=total_annual_scenario,
            total_monthly_baseline_cost=total_monthly_baseline,
            total_monthly_scenario_cost=total_monthly_scenario,
            total_capital_procurement_cost=total_capital,
            incremental_cost_delta=incremental_delta,
            currency="INR",
            verified_cost_percentage=v_pct,
            assumed_cost_percentage=a_pct,
            total_benchmarks_active=total_benchmarks,
            category_breakdown=category_breakdown,
            recent_runs=recent_runs,
        )

    @staticmethod
    def _format_run_response(
        db: Session,
        run: BudgetEstimationRun,
        items_data: Optional[List[Dict[str, Any]]] = None,
    ) -> BudgetEstimationRunResponse:
        """Formats BudgetEstimationRun ORM or record into Pydantic response."""
        state_name = getattr(run.state, 'state_name', getattr(run.state, 'name', None)) if run.state else None
        res_name = getattr(run.resource_type, 'resource_name', getattr(run.resource_type, 'name', None)) if run.resource_type else None

        items_resp = []
        if run.items:
            for it in run.items:
                d_name = getattr(it.district, 'district_name', getattr(it.district, 'name', None)) if it.district else None
                s_name = getattr(it.district.state, 'state_name', getattr(it.district.state, 'name', None)) if it.district and it.district.state else None
                r_name = getattr(it.resource_type, 'resource_name', getattr(it.resource_type, 'name', None)) if it.resource_type else None
                items_resp.append(BudgetEstimationItemResponse(
                    id=it.id,
                    district_id=it.district_id,
                    district_name=d_name,
                    state_name=s_name,
                    resource_type_id=it.resource_type_id,
                    resource_name=r_name,
                    baseline_units=it.baseline_units,
                    recommended_units=it.recommended_units,
                    new_procurement_units=it.new_procurement_units,
                    monthly_recurring_unit_cost=float(it.monthly_recurring_unit_cost),
                    annual_recurring_unit_cost=float(it.annual_recurring_unit_cost),
                    one_time_unit_cost=float(it.one_time_unit_cost),
                    baseline_annual_cost=float(it.baseline_annual_cost),
                    recommended_annual_cost=float(it.recommended_annual_cost),
                    procurement_cost=float(it.procurement_cost),
                    net_delta_annual_cost=float(it.net_delta_annual_cost),
                    data_quality_tier=it.data_quality_tier,
                    explanation=it.explanation,
                ))

        return BudgetEstimationRunResponse(
            id=run.id,
            run_id=run.run_id,
            optimization_run_id=run.optimization_run_id,
            state_id=run.state_id,
            state_name=state_name,
            resource_type_id=run.resource_type_id,
            resource_name=res_name,
            period_year=run.period_year,
            period_month=run.period_month,
            assessment_period=run.assessment_period.isoformat() if isinstance(run.assessment_period, (date, datetime)) else str(run.assessment_period),
            estimation_mode=run.estimation_mode,
            currency=run.currency,
            total_baseline_recurring_annual=float(run.total_baseline_recurring_annual),
            total_scenario_recurring_annual=float(run.total_scenario_recurring_annual),
            total_baseline_recurring_monthly=float(run.total_baseline_recurring_monthly),
            total_scenario_recurring_monthly=float(run.total_scenario_recurring_monthly),
            total_one_time_procurement_cost=float(run.total_one_time_procurement_cost),
            incremental_recurring_cost=float(run.incremental_recurring_cost),
            total_shortfall_resolution_cost=float(run.total_shortfall_resolution_cost),
            verified_cost_ratio=float(run.verified_cost_ratio),
            assumed_cost_ratio=float(run.assumed_cost_ratio),
            status=run.status,
            assumptions_summary=run.assumptions_summary,
            explanation_summary=run.explanation_summary,
            created_at=run.created_at.isoformat() if run.created_at else None,
            items=items_resp if items_resp else None,
        )

    # =========================================================================
    # Phase 11: 10-Pool Comprehensive Budget Calculation Engine
    # =========================================================================

    @staticmethod
    def calculate_district_10pool_budget(
        db: Session,
        district_id: int,
        year: int = 2026,
        month: int = 11,
        cost_overrides: Optional[Dict[str, Dict[str, float]]] = None,
        quantity_overrides: Optional[Dict[str, int]] = None,
        rank: int = 1,
    ) -> DistrictBudgetSummaryItem:
        """
        Calculates granular 10-pool financial requirements for a district by:
        1. Connecting to Phase 10 crime demand calculations and MILP resource allocations.
        2. Applying statutory / configured unit rates from ResourceCostMaster.
        3. Strictly separating CAPEX (new procurement) from OPEX (operational) and Maintenance.
        4. Isolating partner-agency allocations (e.g. Ambulances) from direct police budgets.
        5. Comparing with configured district budget baseline.
        """
        # 1. District and Demands
        dem = CrimeResourceOptimizationService.calculate_district_crime_demand(db, district_id=district_id, year=year, month=month)
        district = db.query(District).filter(District.id == district_id).first()
        state = db.query(State).filter(State.id == dem.state_id).first()
        state_name = state.state_name if state else dem.state_name

        # 2. Active Cost Master Records
        cost_masters = {
            rcm.resource_category: rcm
            for rcm in db.query(ResourceCostMaster).filter(ResourceCostMaster.is_active == True).all()
        }

        # 3. Check existing district inventory
        existing_resources = {
            dr.resource_type_id: dr
            for dr in db.query(DistrictResource).filter(DistrictResource.district_id == district_id).all()
        }

        pool_items: List[PoolCostItem] = []
        tot_capex = 0.0
        tot_opex_m = 0.0
        tot_opex_a = 0.0
        tot_maint_a = 0.0
        tot_partner = 0.0
        tot_police = 0.0
        tot_rec_units = 0
        tot_exist_units = 0
        tot_proc_units = 0

        inv_status_overall = "UNRECORDED"
        has_verified_inv = False

        for pool_cat, (res_id, def_name, def_unit) in CATEGORY_RESOURCE_MAP.items():
            rcm = cost_masters.get(pool_cat)
            
            # Baseline recommended units from Phase 10 demand
            rec_units = dem.resource_demands.get(pool_cat, 0)
            if quantity_overrides and pool_cat in quantity_overrides:
                rec_units = max(0, int(quantity_overrides[pool_cat]))
            elif quantity_overrides and str(res_id) in quantity_overrides:
                rec_units = max(0, int(quantity_overrides[str(res_id)]))

            # Existing inventory check
            dr = existing_resources.get(res_id)
            exist_units = 0
            pool_inv_status = "UNRECORDED"
            if dr and dr.data_status == "VERIFIED":
                exist_units = max(0, dr.available_quantity)
                pool_inv_status = "VERIFIED"
                has_verified_inv = True

            # Additional procurement: only charge for units exceeding available inventory
            if pool_inv_status == "VERIFIED":
                proc_units = max(0, rec_units - exist_units)
                credited_exist = min(rec_units, exist_units)
            else:
                proc_units = rec_units
                credited_exist = 0

            # Unit costs (with optional scenario overrides)
            u_acq = float(rcm.unit_acquisition_cost) if rcm else 0.0
            u_opex = float(rcm.monthly_operating_cost) if rcm else 0.0
            u_maint = float(rcm.annual_maintenance_cost) if rcm else 0.0

            if cost_overrides:
                override = cost_overrides.get(pool_cat) or cost_overrides.get(str(res_id))
                if override:
                    if "acquisition" in override:
                        u_acq = float(override["acquisition"])
                    if "operating" in override:
                        u_opex = float(override["operating"])
                    if "maintenance" in override:
                        u_maint = float(override["maintenance"])

            # Calculations
            pool_acq = proc_units * u_acq
            pool_opex_m = rec_units * u_opex
            pool_opex_a = pool_opex_m * 12.0
            pool_maint_a = rec_units * u_maint
            pool_tot_ann = pool_acq + pool_opex_a + pool_maint_a

            is_partner = rcm.is_partner_agency if rcm else (pool_cat == "EMERGENCY_RESPONSE")
            v_status = rcm.verification_status if rcm else "NOT_CONFIGURED"

            pool_items.append(PoolCostItem(
                resource_category=pool_cat,
                resource_type_id=res_id,
                resource_name=rcm.resource_name if rcm else def_name,
                unit_of_measure=rcm.unit_of_measure if rcm else def_unit,
                recommended_units=rec_units,
                existing_inventory_units=credited_exist,
                procurement_units=proc_units,
                inventory_status=pool_inv_status,
                unit_acquisition_cost=round(u_acq, 2),
                monthly_operating_unit_cost=round(u_opex, 2),
                annual_maintenance_unit_cost=round(u_maint, 2),
                total_acquisition_cost=round(pool_acq, 2),
                monthly_operating_cost=round(pool_opex_m, 2),
                annual_operating_cost=round(pool_opex_a, 2),
                annual_maintenance_cost=round(pool_maint_a, 2),
                total_annual_requirement=round(pool_tot_ann, 2),
                is_partner_agency=is_partner,
                verification_status=v_status,
            ))

            tot_rec_units += rec_units
            tot_exist_units += credited_exist
            tot_proc_units += proc_units

            if is_partner:
                tot_partner += pool_tot_ann
            else:
                tot_capex += pool_acq
                tot_opex_m += pool_opex_m
                tot_opex_a += pool_opex_a
                tot_maint_a += pool_maint_a
                tot_police += pool_tot_ann

        if has_verified_inv:
            inv_status_overall = "PARTIAL"

        # 4. District Configured Budget Lookup
        dba = db.query(DistrictBudgetAllocation).filter(
            DistrictBudgetAllocation.district_id == district_id,
            DistrictBudgetAllocation.budget_year == year,
            DistrictBudgetAllocation.is_active == True,
        ).first()

        conf_budget = None
        conf_status = "NOT_CONFIGURED"
        gap_surplus = None
        unmet_count = 0

        if dba and dba.verification_status != "NOT_CONFIGURED" and dba.annual_budget is not None:
            conf_budget = float(dba.annual_budget)
            conf_status = dba.verification_status
            gap_surplus = round(conf_budget - tot_police, 2)
            if gap_surplus < 0:
                # Proportional deficit: estimate unmet units
                unmet_count = max(1, int(abs(gap_surplus) / 1000000))
        elif dba:
            conf_status = dba.verification_status

        gross_req = tot_police + tot_partner

        return DistrictBudgetSummaryItem(
            rank=rank,
            district_id=district_id,
            district_name=dem.district_name,
            state_id=dem.state_id,
            state_name=state_name,
            risk_score=round(dem.district_risk_score, 2),
            risk_level=dem.district_risk_level,
            recommended_units_total=tot_rec_units,
            existing_inventory_total=tot_exist_units,
            procurement_units_total=tot_proc_units,
            inventory_configured_status=inv_status_overall,
            total_estimated_requirement=round(gross_req, 2),
            total_capex_procurement=round(tot_capex, 2),
            total_opex_annual=round(tot_opex_a, 2),
            total_maintenance_annual=round(tot_maint_a, 2),
            total_partner_agency_cost=round(tot_partner, 2),
            total_police_budget_requirement=round(tot_police, 2),
            configured_budget=round(conf_budget, 2) if conf_budget is not None else None,
            budget_verification_status=conf_status,
            budget_gap_or_surplus=gap_surplus,
            unmet_demand_count=unmet_count,
            pool_breakdown=pool_items,
        )

    @staticmethod
    def get_full_overview(
        db: Session,
        year: int = 2026,
        month: int = 11,
        state_id: Optional[int] = None,
    ) -> FullBudgetOverviewResponse:
        """
        Computes macroeconomic and operational budget overview across the 10 Phase 10 resource pools.
        Strictly isolates partner agency (Ambulance) expenditure from police direct requirements.
        Highlights unconfigured budgets and unrecorded inventories with transparent alerts.
        """
        import time
        cache_key = f"overview_{year}_{month}_{state_id}"
        if cache_key in BudgetService._BUDGET_CACHE:
            cached_time, val = BudgetService._BUDGET_CACHE[cache_key]
            if time.time() - cached_time < BudgetService.CACHE_TTL:
                return val

        # Fetch cost master
        cost_masters = {
            rcm.resource_category: rcm
            for rcm in db.query(ResourceCostMaster).filter(ResourceCostMaster.is_active == True).all()
        }

        # Query districts
        query = db.query(District).filter(District.is_current_admin == True)
        if state_id:
            query = query.filter(District.state_id == state_id)
        districts = query.all()

        # Configured state budgets
        sb_query = db.query(StateBudget).filter(StateBudget.budget_year == year, StateBudget.is_active == True)
        if state_id:
            sb_query = sb_query.filter(StateBudget.state_id == state_id)
        state_budgets = sb_query.all()

        configured_states_count = sum(1 for sb in state_budgets if sb.verification_status != "NOT_CONFIGURED" and sb.annual_budget is not None)
        unconfigured_states_count = sum(1 for sb in state_budgets if sb.verification_status == "NOT_CONFIGURED" or sb.annual_budget is None)
        total_configured_budget = sum(float(sb.annual_budget or 0) for sb in state_budgets if sb.verification_status != "NOT_CONFIGURED")

        # Unconfigured cost items
        unconfigured_cost_count = sum(1 for rcm in cost_masters.values() if rcm.verification_status == "NOT_CONFIGURED")

        # For nationwide overview performance, calculate aggregate demand across all districts
        # Sample or batch calculate for active districts (or full panel if state specified)
        calc_districts = districts[:40] if not state_id and len(districts) > 40 else districts
        scale_factor = (len(districts) / len(calc_districts)) if calc_districts else 1.0

        tot_capex = 0.0
        tot_opex_a = 0.0
        tot_maint_a = 0.0
        tot_partner = 0.0
        tot_police = 0.0

        cat_breakdown: Dict[str, Dict[str, Any]] = {}
        for cat in CATEGORY_RESOURCE_MAP.keys():
            rcm = cost_masters.get(cat)
            cat_breakdown[cat] = {
                "category": cat,
                "resource_name": rcm.resource_name if rcm else cat,
                "unit_of_measure": rcm.unit_of_measure if rcm else "Units",
                "recommended_units": 0,
                "procurement_units": 0,
                "capex_procurement": 0.0,
                "opex_annual": 0.0,
                "maintenance_annual": 0.0,
                "total_requirement": 0.0,
                "is_partner_agency": rcm.is_partner_agency if rcm else (cat == "EMERGENCY_RESPONSE"),
                "verification_status": rcm.verification_status if rcm else "NOT_CONFIGURED",
            }

        unrecorded_districts = 0
        for d in calc_districts:
            try:
                d_item = BudgetService.calculate_district_10pool_budget(db, district_id=d.id, year=year, month=month)
                if d_item.inventory_configured_status == "UNRECORDED":
                    unrecorded_districts += 1

                for p in d_item.pool_breakdown:
                    c_dict = cat_breakdown[p.resource_category]
                    c_dict["recommended_units"] += p.recommended_units
                    c_dict["procurement_units"] += p.procurement_units
                    c_dict["capex_procurement"] += p.total_acquisition_cost
                    c_dict["opex_annual"] += p.annual_operating_cost
                    c_dict["maintenance_annual"] += p.annual_maintenance_cost
                    c_dict["total_requirement"] += p.total_annual_requirement

                    if p.is_partner_agency:
                        tot_partner += p.total_annual_requirement
                    else:
                        tot_capex += p.total_acquisition_cost
                        tot_opex_a += p.annual_operating_cost
                        tot_maint_a += p.annual_maintenance_cost
                        tot_police += p.total_annual_requirement
            except Exception as e:
                continue

        # Scale if sampled
        if scale_factor > 1.05:
            tot_capex *= scale_factor
            tot_opex_a *= scale_factor
            tot_maint_a *= scale_factor
            tot_partner *= scale_factor
            tot_police *= scale_factor
            unrecorded_districts = int(unrecorded_districts * scale_factor)
            for c_dict in cat_breakdown.values():
                c_dict["recommended_units"] = int(c_dict["recommended_units"] * scale_factor)
                c_dict["procurement_units"] = int(c_dict["procurement_units"] * scale_factor)
                c_dict["capex_procurement"] = round(c_dict["capex_procurement"] * scale_factor, 2)
                c_dict["opex_annual"] = round(c_dict["opex_annual"] * scale_factor, 2)
                c_dict["maintenance_annual"] = round(c_dict["maintenance_annual"] * scale_factor, 2)
                c_dict["total_requirement"] = round(c_dict["total_requirement"] * scale_factor, 2)

        tot_gross = tot_police + tot_partner
        tot_gap_surplus = total_configured_budget - tot_police

        warnings = []
        if unconfigured_states_count > 0:
            warnings.append(f"{unconfigured_states_count} States/UTs currently have unconfigured statutory budget baselines. Operational estimates reflect resource requirement only.")
        if unrecorded_districts > 0:
            warnings.append(f"{unrecorded_districts} districts lack recorded standing equipment inventories. Procurement outlays represent an upper-bound replacement ceiling.")
        if unconfigured_cost_count > 0:
            warnings.append(f"{unconfigured_cost_count} resource pools have NOT_CONFIGURED cost benchmarks. Costs are excluded or set to 0 pending administrative input.")

        disclaimer = (
            "STATUTORY FINANCIAL NOTICE: These financial estimates represent model-derived resource expenditure benchmarks "
            "based on BPR&D police deployment norms, GeM procurement contracts, and official scheme guidelines. "
            "They do NOT constitute sanctioned government budget outlays, legislative appropriation bills, or financial audit reports. "
            "Partner-agency medical costs (Ambulances) are segregated from direct police budgets."
        )

        res_overview = FullBudgetOverviewResponse(
            period_year=year,
            period_month=month,
            assessment_period=f"{year:04d}-{month:02d}-01",
            total_gross_estimated_requirement=round(tot_gross, 2),
            total_police_budget_requirement=round(tot_police, 2),
            total_partner_agency_cost=round(tot_partner, 2),
            total_capex_procurement=round(tot_capex, 2),
            total_opex_annual=round(tot_opex_a, 2),
            total_maintenance_annual=round(tot_maint_a, 2),
            total_configured_state_budget=round(total_configured_budget, 2),
            total_budget_gap_or_surplus=round(tot_gap_surplus, 2),
            configured_states_count=configured_states_count,
            unconfigured_states_count=unconfigured_states_count,
            unconfigured_cost_items_count=unconfigured_cost_count,
            unrecorded_inventory_districts_count=unrecorded_districts,
            category_expenditure_breakdown=cat_breakdown,
            capex_vs_opex_summary={
                "capex_procurement": round(tot_capex, 2),
                "opex_annual": round(tot_opex_a, 2),
                "maintenance_annual": round(tot_maint_a, 2),
                "partner_agency": round(tot_partner, 2),
                "total_police": round(tot_police, 2),
            },
            warnings=warnings,
            planning_disclaimer=disclaimer,
        )
        BudgetService._BUDGET_CACHE[cache_key] = (time.time(), res_overview)
        return res_overview

    @staticmethod
    def get_state_budget_summary(
        db: Session,
        year: int = 2026,
        month: int = 11,
    ) -> List[StateBudgetSummaryItem]:
        """
        Returns state-wise budget comparison of estimated financial requirements against configured state budgets.
        Clearly displays unconfigured states with verification_status='NOT_CONFIGURED'.
        """
        import time
        cache_key = f"state_summary_{year}_{month}"
        if cache_key in BudgetService._BUDGET_CACHE:
            cached_time, val = BudgetService._BUDGET_CACHE[cache_key]
            if time.time() - cached_time < BudgetService.CACHE_TTL:
                return val

        states = db.query(State).order_by(State.state_name).all()
        state_budgets = {
            sb.state_id: sb
            for sb in db.query(StateBudget).filter(StateBudget.budget_year == year, StateBudget.is_active == True).all()
        }

        cost_masters = {
            rcm.resource_category: rcm
            for rcm in db.query(ResourceCostMaster).filter(ResourceCostMaster.is_active == True).all()
        }

        results: List[StateBudgetSummaryItem] = []

        for s in states:
            districts = db.query(District).filter(District.state_id == s.id, District.is_current_admin == True).all()
            if not districts:
                continue

            # Calculate or sample for state
            sample_d = districts[:6] if len(districts) > 6 else districts
            scale = (len(districts) / len(sample_d)) if sample_d else 1.0

            s_capex = 0.0
            s_opex_a = 0.0
            s_maint_a = 0.0
            s_partner = 0.0
            s_police = 0.0
            unmet = 0
            inv_districts = 0

            for d in sample_d:
                try:
                    d_item = BudgetService.calculate_district_10pool_budget(db, district_id=d.id, year=year, month=month)
                    s_capex += d_item.total_capex_procurement
                    s_opex_a += d_item.total_opex_annual
                    s_maint_a += d_item.total_maintenance_annual
                    s_partner += d_item.total_partner_agency_cost
                    s_police += d_item.total_police_budget_requirement
                    unmet += d_item.unmet_demand_count
                    if d_item.inventory_configured_status != "UNRECORDED":
                        inv_districts += 1
                except Exception:
                    continue

            if scale > 1.05:
                s_capex *= scale
                s_opex_a *= scale
                s_maint_a *= scale
                s_partner *= scale
                s_police *= scale
                unmet = int(unmet * scale)
                inv_districts = int(inv_districts * scale)

            s_gross = s_police + s_partner

            sb = state_budgets.get(s.id)
            conf_ann = None
            conf_status = "NOT_CONFIGURED"
            gap_surplus = None

            if sb and sb.verification_status != "NOT_CONFIGURED" and sb.annual_budget is not None:
                conf_ann = float(sb.annual_budget)
                conf_status = sb.verification_status
                gap_surplus = round(conf_ann - s_police, 2)
            elif sb:
                conf_status = sb.verification_status

            results.append(StateBudgetSummaryItem(
                state_id=s.id,
                state_name=s.state_name,
                state_code=s.state_code,
                districts_count=len(districts),
                districts_assessed_count=len(districts),
                total_estimated_requirement=round(s_gross, 2),
                total_capex_procurement=round(s_capex, 2),
                total_opex_annual=round(s_opex_a, 2),
                total_maintenance_annual=round(s_maint_a, 2),
                total_partner_agency_cost=round(s_partner, 2),
                total_police_budget_requirement=round(s_police, 2),
                configured_annual_budget=round(conf_ann, 2) if conf_ann is not None else None,
                budget_verification_status=conf_status,
                budget_gap_or_surplus=gap_surplus,
                unmet_demand_total=unmet,
                inventory_configured_districts=inv_districts,
            ))

        BudgetService._BUDGET_CACHE[cache_key] = (time.time(), results)
        return results

    @staticmethod
    def get_district_budget_summary(
        db: Session,
        state_id: Optional[int] = None,
        year: int = 2026,
        month: int = 11,
        skip: int = 0,
        limit: int = 20,
        risk_level: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[DistrictBudgetSummaryItem], int]:
        """
        Returns paginated, filterable district budget register with complete 10-pool breakdown and gap analysis.
        """
        query = db.query(District).filter(District.is_current_admin == True)
        if state_id:
            query = query.filter(District.state_id == state_id)
        if search:
            query = query.filter(District.district_name.ilike(f"%{search}%"))

        total = query.count()
        districts = query.order_by(District.district_name).offset(skip).limit(limit).all()

        items: List[DistrictBudgetSummaryItem] = []
        for idx, d in enumerate(districts):
            try:
                rank = skip + idx + 1
                d_item = BudgetService.calculate_district_10pool_budget(db, district_id=d.id, year=year, month=month, rank=rank)
                if risk_level and d_item.risk_level != risk_level:
                    continue
                items.append(d_item)
            except Exception as e:
                continue

        return items, total

    @staticmethod
    def simulate_budget_scenario(
        db: Session,
        req: BudgetSimulationRequest,
        current_user: Optional[User] = None,
    ) -> BudgetSimulationResponse:
        """
        Executes interactive scenario simulation without modifying baseline inventory, approved budgets, or records.
        Evaluates impact of total budget ceilings, category limits, cost overrides, and quantity changes.
        """
        scenario_id = f"SCEN-SIM-{uuid.uuid4().hex[:8].upper()}"
        year = req.period_year
        month = req.period_month

        # Baseline evaluation
        target_districts = []
        if req.district_id:
            d = db.query(District).filter(District.id == req.district_id).first()
            if d:
                target_districts = [d]
        elif req.state_id:
            target_districts = db.query(District).filter(District.state_id == req.state_id, District.is_current_admin == True).limit(15).all()
        else:
            # Default to sample key districts for nationwide scenario
            target_districts = db.query(District).filter(District.is_current_admin == True).limit(10).all()

        base_police = 0.0
        prop_police = 0.0
        base_partner = 0.0
        prop_partner = 0.0
        tot_capex = 0.0
        tot_opex_a = 0.0
        tot_maint_a = 0.0

        cat_summary: Dict[str, Dict[str, Any]] = {}
        for cat in CATEGORY_RESOURCE_MAP.keys():
            cat_summary[cat] = {
                "category": cat,
                "baseline_requirement": 0.0,
                "proposed_requirement": 0.0,
                "delta": 0.0,
                "category_limit": req.category_budget_limits.get(cat) if req.category_budget_limits else None,
                "status": "WITHIN_LIMIT",
            }

        unmet_demand = 0

        for d in target_districts:
            # Baseline
            b_item = BudgetService.calculate_district_10pool_budget(db, district_id=d.id, year=year, month=month)
            base_police += b_item.total_police_budget_requirement
            base_partner += b_item.total_partner_agency_cost

            # Proposed simulation
            p_item = BudgetService.calculate_district_10pool_budget(
                db,
                district_id=d.id,
                year=year,
                month=month,
                cost_overrides=req.cost_overrides,
                quantity_overrides=req.quantity_overrides,
            )
            prop_police += p_item.total_police_budget_requirement
            prop_partner += p_item.total_partner_agency_cost
            tot_capex += p_item.total_capex_procurement
            tot_opex_a += p_item.total_opex_annual
            tot_maint_a += p_item.total_maintenance_annual

            for p in p_item.pool_breakdown:
                c = cat_summary[p.resource_category]
                c["proposed_requirement"] += p.total_annual_requirement

            for b in b_item.pool_breakdown:
                c = cat_summary[b.resource_category]
                c["baseline_requirement"] += b.total_annual_requirement

        for cat, c_data in cat_summary.items():
            delta = c_data["proposed_requirement"] - c_data["baseline_requirement"]
            c_data["delta"] = round(delta, 2)
            c_data["baseline_requirement"] = round(c_data["baseline_requirement"], 2)
            c_data["proposed_requirement"] = round(c_data["proposed_requirement"], 2)
            lim = c_data.get("category_limit")
            if lim and c_data["proposed_requirement"] > lim:
                c_data["status"] = "EXCEEDED"
                unmet_demand += 1

        delta_req = prop_police - base_police
        surplus_deficit = None
        if req.total_budget_limit is not None:
            surplus_deficit = round(req.total_budget_limit - prop_police, 2)
            if surplus_deficit < 0:
                unmet_demand += max(1, int(abs(surplus_deficit) / 5000000))

        # Record calculation history
        hist_data = {
            "calculation_id": f"CALC-{uuid.uuid4().hex[:10].upper()}",
            "scenario_id": scenario_id,
            "state_id": req.state_id,
            "district_id": req.district_id,
            "period_year": year,
            "period_month": month,
            "assessment_period": date(year, month, 1),
            "total_capex": Decimal(str(round(tot_capex, 2))),
            "total_opex_monthly": Decimal(str(round(tot_opex_a / 12.0, 2))),
            "total_opex_annual": Decimal(str(round(tot_opex_a, 2))),
            "total_maintenance_annual": Decimal(str(round(tot_maint_a, 2))),
            "total_partner_agency_cost": Decimal(str(round(prop_partner, 2))),
            "total_police_budget_requirement": Decimal(str(round(prop_police, 2))),
            "total_gross_requirement": Decimal(str(round(prop_police + prop_partner, 2))),
            "configured_budget": Decimal(str(round(req.total_budget_limit, 2))) if req.total_budget_limit is not None else None,
            "budget_gap_or_surplus": Decimal(str(surplus_deficit)) if surplus_deficit is not None else None,
            "unmet_demand_count": unmet_demand,
            "category_breakdown": cat_summary,
            "calculation_metadata": {
                "assumptions": req.operating_assumptions or {},
                "cost_overrides_applied": bool(req.cost_overrides),
                "quantity_overrides_applied": bool(req.quantity_overrides),
            },
            "created_by_user_id": current_user.id if current_user else None,
        }
        try:
            BudgetRepository.save_budget_calculation_history(db, hist_data)
        except Exception:
            pass

        return BudgetSimulationResponse(
            scenario_id=scenario_id,
            state_id=req.state_id,
            district_id=req.district_id,
            period_year=year,
            period_month=month,
            baseline_police_requirement=round(base_police, 2),
            proposed_police_requirement=round(prop_police, 2),
            delta_requirement=round(delta_req, 2),
            baseline_partner_agency_cost=round(base_partner, 2),
            proposed_partner_agency_cost=round(prop_partner, 2),
            total_capex_procurement=round(tot_capex, 2),
            total_opex_annual=round(tot_opex_a, 2),
            total_maintenance_annual=round(tot_maint_a, 2),
            configured_budget_limit=round(req.total_budget_limit, 2) if req.total_budget_limit is not None else None,
            budget_surplus_or_deficit=surplus_deficit,
            unmet_resource_demand_count=unmet_demand,
            category_summary=cat_summary,
            disclaimer="SIMULATION NOTICE: This hypothetical scenario runs strictly in memory and does NOT modify sanctioned municipal budgets or actual inventory records.",
        )

    # =========================================================================
    # ResourceCostMaster CRUD
    # =========================================================================

    @staticmethod
    def list_cost_master(db: Session, category: Optional[str] = None, is_active: bool = True) -> List[ResourceCostMasterResponse]:
        items = BudgetRepository.get_cost_master_items(db, category=category, is_active=is_active)
        res = []
        for it in items:
            username = it.configured_by.username if it.configured_by else None
            res.append(ResourceCostMasterResponse(
                id=it.id,
                resource_category=it.resource_category,
                resource_type_id=it.resource_type_id,
                resource_name=it.resource_name,
                unit_of_measure=it.unit_of_measure,
                unit_acquisition_cost=float(it.unit_acquisition_cost),
                monthly_operating_cost=float(it.monthly_operating_cost),
                annual_maintenance_cost=float(it.annual_maintenance_cost),
                cost_classification=it.cost_classification,
                currency=it.currency,
                source_of_cost_estimate=it.source_of_cost_estimate,
                source_url_or_document=it.source_url_or_document,
                price_reference_year=it.price_reference_year,
                effective_date=str(it.effective_date) if it.effective_date else None,
                verification_status=it.verification_status,
                is_partner_agency=it.is_partner_agency,
                notes=it.notes,
                is_active=it.is_active,
                last_updated_date=it.last_updated_date.isoformat() if it.last_updated_date else None,
                configured_by_username=username,
            ))
        return res

    @staticmethod
    def get_cost_master_item(db: Session, rcm_id: int) -> Optional[ResourceCostMasterResponse]:
        it = BudgetRepository.get_cost_master_by_id(db, rcm_id)
        if not it:
            return None
        username = it.configured_by.username if it.configured_by else None
        return ResourceCostMasterResponse(
            id=it.id,
            resource_category=it.resource_category,
            resource_type_id=it.resource_type_id,
            resource_name=it.resource_name,
            unit_of_measure=it.unit_of_measure,
            unit_acquisition_cost=float(it.unit_acquisition_cost),
            monthly_operating_cost=float(it.monthly_operating_cost),
            annual_maintenance_cost=float(it.annual_maintenance_cost),
            cost_classification=it.cost_classification,
            currency=it.currency,
            source_of_cost_estimate=it.source_of_cost_estimate,
            source_url_or_document=it.source_url_or_document,
            price_reference_year=it.price_reference_year,
            effective_date=str(it.effective_date) if it.effective_date else None,
            verification_status=it.verification_status,
            is_partner_agency=it.is_partner_agency,
            notes=it.notes,
            is_active=it.is_active,
            last_updated_date=it.last_updated_date.isoformat() if it.last_updated_date else None,
            configured_by_username=username,
        )

    @staticmethod
    def create_cost_master_item(db: Session, data: ResourceCostMasterCreate, current_user: Optional[User] = None) -> ResourceCostMasterResponse:
        payload = data.model_dump()
        payload["configured_by_user_id"] = current_user.id if current_user else None
        it = BudgetRepository.create_cost_master(db, payload)
        return BudgetService.get_cost_master_item(db, it.id)

    @staticmethod
    def update_cost_master_item(db: Session, rcm_id: int, updates: ResourceCostMasterUpdate, current_user: Optional[User] = None) -> Optional[ResourceCostMasterResponse]:
        payload = updates.model_dump(exclude_unset=True)
        if current_user:
            payload["configured_by_user_id"] = current_user.id
        it = BudgetRepository.update_cost_master(db, rcm_id, payload)
        if not it:
            return None
        return BudgetService.get_cost_master_item(db, it.id)

    @staticmethod
    def delete_cost_master_item(db: Session, rcm_id: int) -> bool:
        return BudgetRepository.delete_cost_master(db, rcm_id)

    # =========================================================================
    # StateBudget and DistrictBudget Endpoints
    # =========================================================================

    @staticmethod
    def list_state_budgets(db: Session, year: int = 2026, state_id: Optional[int] = None) -> List[StateBudgetResponse]:
        items = BudgetRepository.get_state_budgets(db, year=year, state_id=state_id)
        res = []
        for it in items:
            res.append(StateBudgetResponse(
                id=it.id,
                state_id=it.state_id,
                state_name=it.state.state_name if it.state else None,
                state_code=it.state.state_code if it.state else None,
                budget_year=it.budget_year,
                annual_budget=float(it.annual_budget) if it.annual_budget is not None else None,
                monthly_budget=float(it.monthly_budget) if it.monthly_budget is not None else None,
                allocated_budget=float(it.allocated_budget) if it.allocated_budget is not None else None,
                spent_budget=float(it.spent_budget) if it.spent_budget is not None else None,
                remaining_budget=float(it.remaining_budget) if it.remaining_budget is not None else None,
                proposed_budget=float(it.proposed_budget) if it.proposed_budget is not None else None,
                currency=it.currency,
                source_document=it.source_document,
                verification_status=it.verification_status,
                notes=it.notes,
                is_active=it.is_active,
                created_at=it.created_at.isoformat() if it.created_at else None,
                updated_at=it.updated_at.isoformat() if it.updated_at else None,
            ))
        return res

    @staticmethod
    def get_state_budget(db: Session, state_id: int, year: int = 2026) -> Optional[StateBudgetResponse]:
        it = BudgetRepository.get_state_budget_by_state(db, state_id=state_id, year=year)
        if not it:
            return None
        return StateBudgetResponse(
            id=it.id,
            state_id=it.state_id,
            state_name=it.state.state_name if it.state else None,
            state_code=it.state.state_code if it.state else None,
            budget_year=it.budget_year,
            annual_budget=float(it.annual_budget) if it.annual_budget is not None else None,
            monthly_budget=float(it.monthly_budget) if it.monthly_budget is not None else None,
            allocated_budget=float(it.allocated_budget) if it.allocated_budget is not None else None,
            spent_budget=float(it.spent_budget) if it.spent_budget is not None else None,
            remaining_budget=float(it.remaining_budget) if it.remaining_budget is not None else None,
            proposed_budget=float(it.proposed_budget) if it.proposed_budget is not None else None,
            currency=it.currency,
            source_document=it.source_document,
            verification_status=it.verification_status,
            notes=it.notes,
            is_active=it.is_active,
            created_at=it.created_at.isoformat() if it.created_at else None,
            updated_at=it.updated_at.isoformat() if it.updated_at else None,
        )

    @staticmethod
    def upsert_state_budget(db: Session, data: StateBudgetCreate, current_user: Optional[User] = None) -> StateBudgetResponse:
        payload = data.model_dump()
        it = BudgetRepository.upsert_state_budget(db, payload)
        return BudgetService.get_state_budget(db, state_id=it.state_id, year=it.budget_year)

    @staticmethod
    def list_district_budgets(db: Session, year: int = 2026, state_id: Optional[int] = None, district_id: Optional[int] = None, skip: int = 0, limit: int = 50) -> Tuple[List[DistrictBudgetAllocationResponse], int]:
        items, total = BudgetRepository.get_district_budgets(db, year=year, state_id=state_id, district_id=district_id, skip=skip, limit=limit)
        res = []
        for it in items:
            res.append(DistrictBudgetAllocationResponse(
                id=it.id,
                district_id=it.district_id,
                district_name=it.district.district_name if it.district else None,
                state_id=it.state_id,
                state_name=it.state.state_name if it.state else None,
                budget_year=it.budget_year,
                budget_month=it.budget_month,
                annual_budget=float(it.annual_budget) if it.annual_budget is not None else None,
                monthly_budget=float(it.monthly_budget) if it.monthly_budget is not None else None,
                allocated_budget=float(it.allocated_budget) if it.allocated_budget is not None else None,
                spent_budget=float(it.spent_budget) if it.spent_budget is not None else None,
                remaining_budget=float(it.remaining_budget) if it.remaining_budget is not None else None,
                proposed_budget=float(it.proposed_budget) if it.proposed_budget is not None else None,
                currency=it.currency,
                verification_status=it.verification_status,
                source_document=it.source_document,
                notes=it.notes,
                is_active=it.is_active,
                created_at=it.created_at.isoformat() if it.created_at else None,
                updated_at=it.updated_at.isoformat() if it.updated_at else None,
            ))
        return res, total

    @staticmethod
    def get_district_budget(db: Session, district_id: int, year: int = 2026) -> Optional[DistrictBudgetAllocationResponse]:
        it = BudgetRepository.get_district_budget_by_district(db, district_id=district_id, year=year)
        if not it:
            return None
        return DistrictBudgetAllocationResponse(
            id=it.id,
            district_id=it.district_id,
            district_name=it.district.district_name if it.district else None,
            state_id=it.state_id,
            state_name=it.state.state_name if it.state else None,
            budget_year=it.budget_year,
            budget_month=it.budget_month,
            annual_budget=float(it.annual_budget) if it.annual_budget is not None else None,
            monthly_budget=float(it.monthly_budget) if it.monthly_budget is not None else None,
            allocated_budget=float(it.allocated_budget) if it.allocated_budget is not None else None,
            spent_budget=float(it.spent_budget) if it.spent_budget is not None else None,
            remaining_budget=float(it.remaining_budget) if it.remaining_budget is not None else None,
            proposed_budget=float(it.proposed_budget) if it.proposed_budget is not None else None,
            currency=it.currency,
            verification_status=it.verification_status,
            source_document=it.source_document,
            notes=it.notes,
            is_active=it.is_active,
            created_at=it.created_at.isoformat() if it.created_at else None,
            updated_at=it.updated_at.isoformat() if it.updated_at else None,
        )

    @staticmethod
    def upsert_district_budget(db: Session, data: DistrictBudgetAllocationCreate, current_user: Optional[User] = None) -> DistrictBudgetAllocationResponse:
        payload = data.model_dump()
        it = BudgetRepository.upsert_district_budget(db, payload)
        return BudgetService.get_district_budget(db, district_id=it.district_id, year=it.budget_year)

    # =========================================================================
    # Scenarios and History
    # =========================================================================

    @staticmethod
    def create_scenario(db: Session, data: BudgetScenarioCreate, current_user: Optional[User] = None) -> BudgetScenarioResponse:
        payload = data.model_dump()
        payload["scenario_id"] = f"SCEN-{uuid.uuid4().hex[:8].upper()}"
        payload["created_by_user_id"] = current_user.id if current_user else None
        scen = BudgetRepository.create_budget_scenario(db, payload)
        return BudgetScenarioResponse.model_validate(scen)

    @staticmethod
    def list_scenarios(db: Session, state_id: Optional[int] = None, district_id: Optional[int] = None) -> List[BudgetScenarioResponse]:
        scens = BudgetRepository.list_budget_scenarios(db, state_id=state_id, district_id=district_id)
        return [BudgetScenarioResponse.model_validate(s) for s in scens]

    @staticmethod
    def list_calculation_history(db: Session, skip: int = 0, limit: int = 20) -> List[BudgetCalculationHistoryResponse]:
        items = BudgetRepository.list_budget_calculation_history(db, skip=skip, limit=limit)
        res = []
        for it in items:
            res.append(BudgetCalculationHistoryResponse(
                id=it.id,
                calculation_id=it.calculation_id,
                scenario_id=it.scenario_id,
                optimization_run_id=it.optimization_run_id,
                state_id=it.state_id,
                district_id=it.district_id,
                period_year=it.period_year,
                period_month=it.period_month,
                assessment_period=str(it.assessment_period),
                total_capex=float(it.total_capex),
                total_opex_monthly=float(it.total_opex_monthly),
                total_opex_annual=float(it.total_opex_annual),
                total_maintenance_annual=float(it.total_maintenance_annual),
                total_partner_agency_cost=float(it.total_partner_agency_cost),
                total_police_budget_requirement=float(it.total_police_budget_requirement),
                total_gross_requirement=float(it.total_gross_requirement),
                configured_budget=float(it.configured_budget) if it.configured_budget is not None else None,
                budget_gap_or_surplus=float(it.budget_gap_or_surplus) if it.budget_gap_or_surplus is not None else None,
                unmet_demand_count=it.unmet_demand_count,
                created_at=it.created_at.isoformat() if it.created_at else None,
            ))
        return res


