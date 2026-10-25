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
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.models.budget import CostBenchmarkRate, BudgetEstimationRun, BudgetEstimationItem
from backend.app.models.optimization import OptimizationRun, OptimizationAllocation
from backend.app.models.resources import ResourceType, DistrictResource
from backend.app.models.geography import State, District
from backend.app.models.auth import User
from backend.app.repositories.budget_repository import BudgetRepository
from backend.app.schemas.budget import (
    BudgetEstimateRequest,
    BudgetEstimationRunResponse,
    BudgetEstimationItemResponse,
    ScenarioCostComparisonResponse,
    BudgetOverviewResponse,
    CostBenchmarkRateResponse,
)


class BudgetService:

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

