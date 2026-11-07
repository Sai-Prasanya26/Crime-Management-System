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
    is_simulation = Column(Boolean, nullable=False, default=False)
    allocation_mode = Column(String(30), nullable=False, default="OPERATIONAL")
    data_validity = Column(String(50), nullable=False, default="VERIFIED")
    transferable_pool = Column(Integer, nullable=True)
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
    baseline_status = Column(String(40), nullable=False, default="OFFICIAL_DISTRICT_DISCLOSED")
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
    crime_breakdown_json = Column(JSON, nullable=True)
    coverage_percentage = Column(DECIMAL(5, 2), nullable=True, default=100.00)
    unmet_demand = Column(Integer, nullable=False, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_opt_alloc_run", "run_id"),
        Index("idx_opt_alloc_district", "district_id"),
        UniqueConstraint("run_id", "district_id", name="uq_opt_alloc_run_district"),
    )

    # Relationships
    district = relationship("District")
    run = relationship("OptimizationRun", back_populates="allocations", primaryjoin="foreign(OptimizationAllocation.run_id)==OptimizationRun.run_id")


class CrimeResourceMapping(Base):
    __tablename__ = "crime_resource_mappings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    crime_type_id = Column(Integer, ForeignKey("crime_types.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_type_id = Column(Integer, ForeignKey("resource_types.id", ondelete="RESTRICT"), nullable=False, index=True)
    coefficient = Column(DECIMAL(6, 3), nullable=False, default=0.500)
    min_demand_threshold = Column(DECIMAL(6, 3), nullable=False, default=0.050)
    priority_weight = Column(DECIMAL(4, 2), nullable=False, default=1.00)
    shared_pool_category = Column(String(50), nullable=False, default="PERSONNEL")
    operational_rationale = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("crime_type_id", "resource_type_id", name="uq_crime_res_mapping"),
        Index("idx_crm_pool", "shared_pool_category", "is_active"),
    )

    # Relationships
    crime_type = relationship("CrimeType")
    resource_type = relationship("ResourceType")


class ResourceInventoryRecord(Base):
    __tablename__ = "resource_inventory_records"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    state_id = Column(Integer, ForeignKey("states.id", ondelete="RESTRICT"), nullable=False, index=True)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="SET NULL"), nullable=True, index=True)
    resource_type_id = Column(Integer, ForeignKey("resource_types.id", ondelete="RESTRICT"), nullable=False, index=True)
    category = Column(String(50), nullable=False, default="PERSONNEL", index=True)
    total_inventory = Column(Integer, nullable=False, default=0)
    deployed_count = Column(Integer, nullable=False, default=0)
    unavailable_count = Column(Integer, nullable=False, default=0)
    available_pool = Column(Integer, nullable=False, default=0)
    data_status = Column(String(50), nullable=False, default="OFFICIAL_BPRD_BENCHMARK")
    reference_year = Column(SmallInteger, nullable=False, default=2024, index=True)
    source_name = Column(String(150), nullable=False, default="BPR&D Data on Police Organizations")
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("state_id", "district_id", "resource_type_id", "reference_year", name="uq_res_inv_record"),
        Index("idx_inv_status", "data_status"),
    )

    # Relationships
    state = relationship("State")
    district = relationship("District")
    resource_type = relationship("ResourceType")

