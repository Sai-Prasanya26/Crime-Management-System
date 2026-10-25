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

