"""
Phase 11: Budget & Cost Repository.

Data access layer for:
- Cost benchmark rates and provenance
- Budget estimation runs and itemized district calculations
- Joins with optimization scenarios, districts, and resource types
"""

from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, text
from backend.app.models.budget import CostBenchmarkRate, BudgetEstimationRun, BudgetEstimationItem
from backend.app.models.resources import ResourceType
from backend.app.models.geography import District, State
from backend.app.models.optimization import OptimizationRun, OptimizationAllocation


class BudgetRepository:

    @staticmethod
    def get_cost_benchmarks(
        db: Session,
        resource_type_id: Optional[int] = None,
        cost_type: Optional[str] = None,
        active_only: bool = True,
    ) -> List[CostBenchmarkRate]:
        """Fetches active cost benchmarks with joined resource type metadata."""
        query = db.query(CostBenchmarkRate).join(ResourceType, CostBenchmarkRate.resource_type_id == ResourceType.id)
        if active_only:
            query = query.filter(CostBenchmarkRate.is_active == True)
        if resource_type_id is not None:
            query = query.filter(CostBenchmarkRate.resource_type_id == resource_type_id)
        if cost_type is not None:
            query = query.filter(CostBenchmarkRate.cost_type == cost_type)
        return query.order_by(CostBenchmarkRate.resource_type_id, CostBenchmarkRate.cost_type).all()

    @staticmethod
    def get_benchmark_by_id(db: Session, rate_id: int) -> Optional[CostBenchmarkRate]:
        return db.query(CostBenchmarkRate).filter(CostBenchmarkRate.id == rate_id).first()

    @staticmethod
    def create_benchmark_rate(db: Session, data: Dict[str, Any]) -> CostBenchmarkRate:
        rate = CostBenchmarkRate(**data)
        db.add(rate)
        db.commit()
        db.refresh(rate)
        return rate

    @staticmethod
    def update_benchmark_rate(db: Session, rate_id: int, updates: Dict[str, Any]) -> Optional[CostBenchmarkRate]:
        rate = db.query(CostBenchmarkRate).filter(CostBenchmarkRate.id == rate_id).first()
        if not rate:
            return None
        for k, v in updates.items():
            if v is not None:
                setattr(rate, k, v)
        db.commit()
        db.refresh(rate)
        return rate

    @staticmethod
    def get_effective_rates_for_resource(
        db: Session,
        resource_type_id: int,
    ) -> Dict[str, Any]:
        """
        Calculates effective recurring monthly, annual, and one-time capital rates for a resource type.
        If specific type is not explicitly seeded, uses category fallback.
        """
        rates = (
            db.query(CostBenchmarkRate)
            .filter(CostBenchmarkRate.resource_type_id == resource_type_id, CostBenchmarkRate.is_active == True)
            .all()
        )

        res_type = db.query(ResourceType).filter(ResourceType.id == resource_type_id).first()
        category = res_type.category if res_type else "PERSONNEL"

        # Fallback rates by category if specific resource has no benchmarks
        category_defaults = {
            "PERSONNEL": {
                "monthly_recurring": 50000.0,
                "annual_recurring": 600000.0,
                "one_time_capital": 60000.0,
                "tier": "ESTIMATED_BENCHMARK",
                "source": "7th CPC Level 5/6 Standard Personnel Benchmark",
                "notes": "Category default derived from Central Pay Commission matrix.",
            },
            "MOBILITY": {
                "monthly_recurring": 22000.0,
                "annual_recurring": 264000.0,
                "one_time_capital": 950000.0,
                "tier": "ESTIMATED_BENCHMARK",
                "source": "GeM Utility Patrol Fleet Benchmark",
                "notes": "Category default derived from police patrol vehicle standard O&M.",
            },
            "INVESTIGATION": {
                "monthly_recurring": 18000.0,
                "annual_recurring": 216000.0,
                "one_time_capital": 480000.0,
                "tier": "ESTIMATED_BENCHMARK",
                "source": "BPR&D CSI Kit Standards 2021",
                "notes": "Category default derived from crime scene investigation equipment.",
            },
            "SURVEILLANCE": {
                "monthly_recurring": 6500.0,
                "annual_recurring": 78000.0,
                "one_time_capital": 350000.0,
                "tier": "ESTIMATED_BENCHMARK",
                "source": "Safe City MHA DPR 2022",
                "notes": "Category default derived from junction surveillance package.",
            },
            "INFRASTRUCTURE": {
                "monthly_recurring": 45000.0,
                "annual_recurring": 540000.0,
                "one_time_capital": 800000.0,
                "tier": "ASSUMPTION_BASED",
                "source": "State Police Station Contingency Norms",
                "notes": "Category default for police station building operations.",
            },
            "SPECIALIZED": {
                "monthly_recurring": 50000.0,
                "annual_recurring": 600000.0,
                "one_time_capital": 500000.0,
                "tier": "ASSUMPTION_BASED",
                "source": "Specialized Unit Operating Allowance Norms",
                "notes": "Category default for specialized anti-terror/cyber cells.",
            },
            "EMERGENCY": {
                "monthly_recurring": 35000.0,
                "annual_recurring": 420000.0,
                "one_time_capital": 300000.0,
                "tier": "ASSUMPTION_BASED",
                "source": "Dial 112 Emergency Response O&M Norms",
                "notes": "Category default for emergency dispatch and control.",
            },
            "STATION_CAPACITY": {
                "monthly_recurring": 30000.0,
                "annual_recurring": 360000.0,
                "one_time_capital": 250000.0,
                "tier": "ASSUMPTION_BASED",
                "source": "Station Auxiliary Support Norms",
                "notes": "Category default for outpost and station capacity assets.",
            },
        }

        if not rates:
            cat_def = category_defaults.get(category, category_defaults["PERSONNEL"])
            return {
                "resource_type_id": resource_type_id,
                "category": category,
                "monthly_recurring_unit_cost": cat_def["monthly_recurring"],
                "annual_recurring_unit_cost": cat_def["annual_recurring"],
                "one_time_unit_cost": cat_def["one_time_capital"],
                "primary_tier": cat_def["tier"],
                "sources": [cat_def["source"]],
                "assumptions": [cat_def["notes"]],
                "is_fallback": True,
            }

        monthly_recurring = 0.0
        annual_recurring_override = None
        one_time_capital = 0.0
        tiers = []
        sources = []
        assumptions = []

        for r in rates:
            cost_val = float(r.unit_cost_inr)
            tiers.append(r.data_quality_tier)
            sources.append(f"{r.source_name} ({r.source_publication}, {r.reference_year})")
            if r.assumptions_notes:
                assumptions.append(f"{r.cost_component}: {r.assumptions_notes}")

            if r.cost_type == "RECURRING_MONTHLY":
                monthly_recurring += cost_val
            elif r.cost_type == "RECURRING_ANNUAL":
                annual_recurring_override = cost_val
            elif r.cost_type == "ONE_TIME_CAPITAL":
                one_time_capital += cost_val

        annual_recurring = annual_recurring_override if annual_recurring_override is not None else (monthly_recurring * 12.0)

        # Determine dominant tier
        if "OFFICIAL_DOCUMENTED" in tiers:
            primary_tier = "OFFICIAL_DOCUMENTED"
        elif "ESTIMATED_BENCHMARK" in tiers:
            primary_tier = "ESTIMATED_BENCHMARK"
        else:
            primary_tier = "ASSUMPTION_BASED"

        return {
            "resource_type_id": resource_type_id,
            "category": category,
            "monthly_recurring_unit_cost": monthly_recurring,
            "annual_recurring_unit_cost": annual_recurring,
            "one_time_unit_cost": one_time_capital,
            "primary_tier": primary_tier,
            "sources": list(set(sources)),
            "assumptions": assumptions,
            "is_fallback": False,
        }

    @staticmethod
    def save_budget_run(
        db: Session,
        run_data: Dict[str, Any],
        items_data: List[Dict[str, Any]],
    ) -> BudgetEstimationRun:
        """Saves a budget estimation run and its associated itemized calculations."""
        run = BudgetEstimationRun(**run_data)
        db.add(run)
        db.flush()

        for item_data in items_data:
            item = BudgetEstimationItem(**item_data)
            db.add(item)

        db.commit()
        db.refresh(run)
        return run

    @staticmethod
    def get_budget_run_by_id(db: Session, run_id: str) -> Optional[BudgetEstimationRun]:
        return (
            db.query(BudgetEstimationRun)
            .options(
                joinedload(BudgetEstimationRun.state),
                joinedload(BudgetEstimationRun.resource_type),
                joinedload(BudgetEstimationRun.items).joinedload(BudgetEstimationItem.district),
                joinedload(BudgetEstimationRun.items).joinedload(BudgetEstimationItem.resource_type),
            )
            .filter(BudgetEstimationRun.run_id == run_id)
            .first()
        )

    @staticmethod
    def list_budget_runs(
        db: Session,
        skip: int = 0,
        limit: int = 20,
    ) -> List[BudgetEstimationRun]:
        return (
            db.query(BudgetEstimationRun)
            .options(
                joinedload(BudgetEstimationRun.state),
                joinedload(BudgetEstimationRun.resource_type),
            )
            .order_by(desc(BudgetEstimationRun.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_latest_run(db: Session) -> Optional[BudgetEstimationRun]:
        return (
            db.query(BudgetEstimationRun)
            .filter(BudgetEstimationRun.status == "COMPLETED")
            .order_by(desc(BudgetEstimationRun.created_at))
            .first()
        )

