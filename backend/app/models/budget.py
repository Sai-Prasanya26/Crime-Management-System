"""
Phase 11: Budget Estimation and Cost Analysis Models.

Defines:
- CostBenchmarkRate: Stores verified and benchmark unit rates with explicit source provenance and data-quality tiers.
- BudgetEstimationRun: Stores macroeconomic and operational cost estimates linked to optimization scenarios.
- BudgetEstimationItem: Stores district-level granular cost items, baseline vs scenario costs, and procurement estimates.
"""

from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    SmallInteger,
    String,
    Text,
    DECIMAL,
    Boolean,
    ForeignKey,
    TIMESTAMP,
    Date,
    JSON,
    func,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class CostBenchmarkRate(Base):
    __tablename__ = "cost_benchmark_rates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    resource_type_id = Column(Integer, ForeignKey("resource_types.id", ondelete="RESTRICT"), nullable=False)
    cost_type = Column(String(30), nullable=False)  # RECURRING_MONTHLY, RECURRING_ANNUAL, ONE_TIME_CAPITAL
    cost_component = Column(String(50), nullable=False)  # SALARY_ALLOWANCES, FUEL_POL, MAINTENANCE, EQUIPMENT_PROCUREMENT, FACILITY_UPKEEP
    unit_cost_inr = Column(DECIMAL(14, 2), nullable=False)
    source_name = Column(String(150), nullable=False)
    source_publication = Column(String(255), nullable=False)
    reference_year = Column(SmallInteger, nullable=False, default=2024)
    data_quality_tier = Column(String(30), nullable=False, default="ESTIMATED_BENCHMARK")  # OFFICIAL_DOCUMENTED, ESTIMATED_BENCHMARK, ASSUMPTION_BASED
    formula_expression = Column(String(255), nullable=False)
    assumptions_notes = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_bench_resource", "resource_type_id", "cost_type"),
        Index("idx_bench_tier", "data_quality_tier"),
        UniqueConstraint("resource_type_id", "cost_type", "cost_component", name="uq_bench_rate"),
    )

    # Relationships
    resource_type = relationship("ResourceType")


class BudgetEstimationRun(Base):
    __tablename__ = "budget_estimation_runs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    run_id = Column(String(64), unique=True, nullable=False, index=True)
    optimization_run_id = Column(String(64), nullable=True, index=True)
    state_id = Column(Integer, ForeignKey("states.id", ondelete="RESTRICT"), nullable=True)
    resource_type_id = Column(Integer, ForeignKey("resource_types.id", ondelete="RESTRICT"), nullable=True)
    period_year = Column(SmallInteger, nullable=False)
    period_month = Column(SmallInteger, nullable=False)
    assessment_period = Column(Date, nullable=False)
    estimation_mode = Column(String(30), nullable=False, default="OPERATIONAL_COST")  # OPERATIONAL_COST, SIMULATION_ESTIMATE, INSUFFICIENT_DATA
    currency = Column(String(10), nullable=False, default="INR")
    total_baseline_recurring_annual = Column(DECIMAL(16, 2), nullable=False, default=0.00)
    total_scenario_recurring_annual = Column(DECIMAL(16, 2), nullable=False, default=0.00)
    total_baseline_recurring_monthly = Column(DECIMAL(16, 2), nullable=False, default=0.00)
    total_scenario_recurring_monthly = Column(DECIMAL(16, 2), nullable=False, default=0.00)
    total_one_time_procurement_cost = Column(DECIMAL(16, 2), nullable=False, default=0.00)
    incremental_recurring_cost = Column(DECIMAL(16, 2), nullable=False, default=0.00)
    total_shortfall_resolution_cost = Column(DECIMAL(16, 2), nullable=False, default=0.00)
    verified_cost_ratio = Column(DECIMAL(5, 2), nullable=False, default=0.00)
    assumed_cost_ratio = Column(DECIMAL(5, 2), nullable=False, default=1.00)
    status = Column(String(30), nullable=False, default="COMPLETED")  # COMPLETED, INSUFFICIENT_DATA, FAILED
    assumptions_summary = Column(JSON, nullable=True)
    explanation_summary = Column(Text, nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_budget_runs_period", "period_year", "period_month"),
        Index("idx_budget_runs_opt", "optimization_run_id"),
        Index("idx_budget_runs_status", "status"),
    )

    # Relationships
    state = relationship("State")
    resource_type = relationship("ResourceType")
    created_by = relationship("User")
    items = relationship(
        "BudgetEstimationItem",
        back_populates="run",
        cascade="all, delete-orphan",
        primaryjoin="BudgetEstimationRun.run_id==foreign(BudgetEstimationItem.run_id)",
    )


class BudgetEstimationItem(Base):
    __tablename__ = "budget_estimation_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    run_id = Column(String(64), nullable=False, index=True)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="RESTRICT"), nullable=False)
    resource_type_id = Column(Integer, ForeignKey("resource_types.id", ondelete="RESTRICT"), nullable=False)
    baseline_units = Column(Integer, nullable=True)
    recommended_units = Column(Integer, nullable=False, default=0)
    new_procurement_units = Column(Integer, nullable=False, default=0)
    monthly_recurring_unit_cost = Column(DECIMAL(12, 2), nullable=False, default=0.00)
    annual_recurring_unit_cost = Column(DECIMAL(14, 2), nullable=False, default=0.00)
    one_time_unit_cost = Column(DECIMAL(14, 2), nullable=False, default=0.00)
    baseline_annual_cost = Column(DECIMAL(14, 2), nullable=False, default=0.00)
    recommended_annual_cost = Column(DECIMAL(14, 2), nullable=False, default=0.00)
    procurement_cost = Column(DECIMAL(14, 2), nullable=False, default=0.00)
    net_delta_annual_cost = Column(DECIMAL(14, 2), nullable=False, default=0.00)
    data_quality_tier = Column(String(30), nullable=False, default="ESTIMATED_BENCHMARK")
    explanation = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_budget_items_run", "run_id"),
        Index("idx_budget_items_district", "district_id"),
        Index("idx_budget_items_resource", "resource_type_id"),
    )

    # Relationships
    run = relationship(
        "BudgetEstimationRun",
        back_populates="items",
        primaryjoin="foreign(BudgetEstimationItem.run_id)==BudgetEstimationRun.run_id",
    )
    district = relationship("District")
    resource_type = relationship("ResourceType")


class ResourceCostMaster(Base):
    """
    Configurable Resource Cost Master supporting all 10 Phase 10 resource pools.
    Tracks unit acquisition (CAPEX), recurring operational (OPEX), and annual maintenance costs
    with explicit provenance and data verification status.
    """
    __tablename__ = "resource_cost_master"

    id = Column(Integer, primary_key=True, autoincrement=True)
    resource_category = Column(String(50), nullable=False, index=True)  # PERSONNEL, MOBILITY, INVESTIGATION, etc.
    resource_type_id = Column(Integer, ForeignKey("resource_types.id", ondelete="RESTRICT"), nullable=False, index=True)
    resource_name = Column(String(150), nullable=False)
    unit_of_measure = Column(String(50), nullable=False)
    unit_acquisition_cost = Column(DECIMAL(14, 2), nullable=False, default=0.00)  # CAPEX
    monthly_operating_cost = Column(DECIMAL(14, 2), nullable=False, default=0.00)  # OPEX (salary/fuel/power)
    annual_maintenance_cost = Column(DECIMAL(14, 2), nullable=False, default=0.00)  # Maintenance
    cost_classification = Column(String(20), nullable=False, default="CAPEX")  # CAPEX, OPEX, HYBRID
    currency = Column(String(10), nullable=False, default="INR")
    source_of_cost_estimate = Column(String(200), nullable=False, default="ADMIN_ESTIMATE")
    source_url_or_document = Column(String(255), nullable=True)
    price_reference_year = Column(SmallInteger, nullable=False, default=2024)
    effective_date = Column(Date, nullable=False, default=func.current_date())
    last_updated_date = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)
    verification_status = Column(String(30), nullable=False, default="NOT_CONFIGURED")  # OFFICIAL_SOURCE, VERIFIED_QUOTATION, ADMIN_ESTIMATE, NOT_CONFIGURED
    is_partner_agency = Column(Boolean, nullable=False, default=False)  # True for Ambulances / Health Dept
    configured_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        Index("idx_rcm_category", "resource_category"),
        Index("idx_rcm_status", "verification_status"),
        UniqueConstraint("resource_type_id", name="uq_rcm_resource_type"),
    )

    # Relationships
    resource_type = relationship("ResourceType")
    configured_by = relationship("User")


class StateBudget(Base):
    """
    State-level statutory and administrative budget baseline.
    Clearly distinguishes verified/sanctioned allocations from unconfigured placeholders.
    """
    __tablename__ = "state_budgets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    state_id = Column(Integer, ForeignKey("states.id", ondelete="RESTRICT"), nullable=False, index=True)
    budget_year = Column(SmallInteger, nullable=False, default=2026, index=True)
    annual_budget = Column(DECIMAL(16, 2), nullable=True)  # Nullable if unconfigured
    monthly_budget = Column(DECIMAL(16, 2), nullable=True)
    allocated_budget = Column(DECIMAL(16, 2), nullable=True)
    spent_budget = Column(DECIMAL(16, 2), nullable=True)
    remaining_budget = Column(DECIMAL(16, 2), nullable=True)
    proposed_budget = Column(DECIMAL(16, 2), nullable=True)
    currency = Column(String(10), nullable=False, default="INR")
    source_document = Column(String(255), nullable=True)
    verification_status = Column(String(30), nullable=False, default="NOT_CONFIGURED")  # OFFICIAL_SOURCE, SANCTIONED_BUDGET, ADMIN_ESTIMATE, NOT_CONFIGURED
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("state_id", "budget_year", name="uq_state_budget_year"),
        Index("idx_state_budget_year", "state_id", "budget_year"),
    )

    # Relationships
    state = relationship("State")


class DistrictBudgetAllocation(Base):
    """
    District-level budget allocations and operational grant tracking.
    """
    __tablename__ = "district_budget_allocations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="RESTRICT"), nullable=False, index=True)
    state_id = Column(Integer, ForeignKey("states.id", ondelete="RESTRICT"), nullable=False, index=True)
    budget_year = Column(SmallInteger, nullable=False, default=2026, index=True)
    budget_month = Column(SmallInteger, nullable=True)
    annual_budget = Column(DECIMAL(16, 2), nullable=True)  # Nullable if unconfigured
    monthly_budget = Column(DECIMAL(16, 2), nullable=True)
    allocated_budget = Column(DECIMAL(16, 2), nullable=True)
    spent_budget = Column(DECIMAL(16, 2), nullable=True)
    remaining_budget = Column(DECIMAL(16, 2), nullable=True)
    proposed_budget = Column(DECIMAL(16, 2), nullable=True)
    currency = Column(String(10), nullable=False, default="INR")
    verification_status = Column(String(30), nullable=False, default="NOT_CONFIGURED")  # OFFICIAL_SOURCE, SANCTIONED_BUDGET, ADMIN_ESTIMATE, NOT_CONFIGURED
    source_document = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("district_id", "budget_year", name="uq_district_budget_year"),
        Index("idx_district_budget_year", "district_id", "budget_year"),
    )

    # Relationships
    district = relationship("District")
    state = relationship("State")


class BudgetScenario(Base):
    """
    Interactive Scenario Simulator configuration.
    Stores hypothetical budget ceilings, category caps, and unit cost overrides
    without altering actual inventory, approved budgets, or historical records.
    """
    __tablename__ = "budget_scenarios"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    scenario_id = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    state_id = Column(Integer, ForeignKey("states.id", ondelete="SET NULL"), nullable=True)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="SET NULL"), nullable=True)
    budget_year = Column(SmallInteger, nullable=False, default=2026)
    budget_month = Column(SmallInteger, nullable=False, default=11)
    total_budget_limit = Column(DECIMAL(16, 2), nullable=True)
    category_budget_limits = Column(JSON, nullable=True)  # {"PERSONNEL": 5000000, "MOBILITY": 2000000}
    cost_overrides = Column(JSON, nullable=True)  # {"1": {"acquisition": 80000, "operating": 60000}}
    quantity_overrides = Column(JSON, nullable=True)  # {"1": 25, "2": 10}
    operating_assumptions = Column(JSON, nullable=True)  # {"months": 12, "inflation_pct": 5}
    is_baseline = Column(Boolean, nullable=False, default=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_budget_scenarios_state", "state_id"),
        Index("idx_budget_scenarios_date", "budget_year", "budget_month"),
    )

    # Relationships
    state = relationship("State")
    district = relationship("District")
    created_by = relationship("User")


class BudgetCalculationHistory(Base):
    """
    Audit and calculation history for completed budget evaluations and simulations.
    Preserves exact CAPEX, OPEX, Maintenance, Partner-agency, and Police requirements.
    """
    __tablename__ = "budget_calculation_history"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    calculation_id = Column(String(64), unique=True, nullable=False, index=True)
    scenario_id = Column(String(64), nullable=True, index=True)
    optimization_run_id = Column(String(64), nullable=True, index=True)
    state_id = Column(Integer, ForeignKey("states.id", ondelete="SET NULL"), nullable=True)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="SET NULL"), nullable=True)
    period_year = Column(SmallInteger, nullable=False, default=2026)
    period_month = Column(SmallInteger, nullable=False, default=11)
    assessment_period = Column(Date, nullable=False)
    total_capex = Column(DECIMAL(16, 2), nullable=False, default=0.00)
    total_opex_monthly = Column(DECIMAL(16, 2), nullable=False, default=0.00)
    total_opex_annual = Column(DECIMAL(16, 2), nullable=False, default=0.00)
    total_maintenance_annual = Column(DECIMAL(16, 2), nullable=False, default=0.00)
    total_partner_agency_cost = Column(DECIMAL(16, 2), nullable=False, default=0.00)
    total_police_budget_requirement = Column(DECIMAL(16, 2), nullable=False, default=0.00)
    total_gross_requirement = Column(DECIMAL(16, 2), nullable=False, default=0.00)
    configured_budget = Column(DECIMAL(16, 2), nullable=True)
    budget_gap_or_surplus = Column(DECIMAL(16, 2), nullable=True)
    unmet_demand_count = Column(Integer, nullable=False, default=0)
    category_breakdown = Column(JSON, nullable=True)
    district_summaries = Column(JSON, nullable=True)
    calculation_metadata = Column(JSON, nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_bch_period", "period_year", "period_month"),
        Index("idx_bch_state", "state_id"),
    )

    # Relationships
    state = relationship("State")
    district = relationship("District")
    created_by = relationship("User")


