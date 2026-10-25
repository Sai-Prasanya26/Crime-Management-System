"""
Phase 10: Optimization Models.

Defines:
- OptimizationRun: Stores scenario metadata, solver outputs, audit trails, and explainability summaries.
- OptimizationAllocation: Stores district-level recommended resource allocations under operational constraints.
"""

from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    SmallInteger,
    String,
    Text,
    DECIMAL,
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


class OptimizationRun(Base):
    __tablename__ = "optimization_runs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    run_id = Column(String(64), unique=True, nullable=False, index=True)
    scenario_name = Column(String(100), nullable=False)
    scenario_type = Column(String(50), nullable=False, default="BASELINE_CONSTRAINED")
    state_id = Column(Integer, ForeignKey("states.id", ondelete="RESTRICT"), nullable=True)
    resource_type_id = Column(Integer, ForeignKey("resource_types.id", ondelete="RESTRICT"), nullable=False)
    period_year = Column(SmallInteger, nullable=False)
    period_month = Column(SmallInteger, nullable=False)
    assessment_period = Column(Date, nullable=False)
    risk_version = Column(String(20), nullable=False, default="risk-v2.0")
    forecast_model_id = Column(Integer, ForeignKey("ml_models.id", ondelete="SET NULL"), nullable=True)
    forecast_model_version = Column(String(50), nullable=True)
    forecast_origin_date = Column(Date, nullable=True)
    algorithm = Column(String(50), nullable=False, default="MILP_SCIPY_V2")
    pool_capacity = Column(Integer, nullable=False)
    allocated_total = Column(Integer, nullable=False, default=0)
    remaining_pool = Column(Integer, nullable=False, default=0)
    total_demand = Column(Integer, nullable=False, default=0)
    shortfall_before = Column(Integer, nullable=False, default=0)
    shortfall_after = Column(Integer, nullable=False, default=0)
    solver_status = Column(String(30), nullable=False, default="OPTIMAL")
    objective_value = Column(DECIMAL(12, 4), nullable=True)
    execution_duration_ms = Column(Integer, nullable=False, default=0)
    constraints_summary = Column(JSON, nullable=True)
    explanation_summary = Column(Text, nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_opt_runs_period", "period_year", "period_month"),
        Index("idx_opt_runs_state_res", "state_id", "resource_type_id"),
        Index("idx_opt_runs_status", "solver_status"),
    )

    # Relationships
    state = relationship("State")
    resource_type = relationship("ResourceType")
    created_by = relationship("User")
    allocations = relationship("OptimizationAllocation", back_populates="run", cascade="all, delete-orphan", primaryjoin="OptimizationRun.run_id==foreign(OptimizationAllocation.run_id)")


class OptimizationAllocation(Base):
    __tablename__ = "optimization_allocations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    run_id = Column(String(64), nullable=False, index=True)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="RESTRICT"), nullable=False)
    baseline_quantity = Column(Integer, nullable=True)
    required_quantity = Column(Integer, nullable=False, default=0)
    recommended_quantity = Column(Integer, nullable=False, default=0)
    change_quantity = Column(Integer, nullable=False, default=0)
    shortfall_before = Column(Integer, nullable=False, default=0)
    shortfall_after = Column(Integer, nullable=False, default=0)
    priority_score = Column(DECIMAL(6, 2), nullable=False, default=0.00)
    risk_score = Column(DECIMAL(5, 2), nullable=False, default=0.00)
    risk_level = Column(String(20), nullable=False, default="LOW")
    allocation_status = Column(String(30), nullable=False, default="SATISFIED")
    explanation = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_opt_alloc_run", "run_id"),
        Index("idx_opt_alloc_district", "district_id"),
        UniqueConstraint("run_id", "district_id", name="uq_opt_alloc_run_district"),
    )

    # Relationships
    district = relationship("District")
    run = relationship("OptimizationRun", back_populates="allocations", primaryjoin="foreign(OptimizationAllocation.run_id)==OptimizationRun.run_id")
