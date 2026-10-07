from sqlalchemy import Column, Integer, SmallInteger, String, Text, Boolean, Date, DECIMAL, ForeignKey, TIMESTAMP, UniqueConstraint, Index, func
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class ResourceType(Base):
    __tablename__ = "resource_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(50), unique=True, nullable=True, index=True)
    resource_name = Column(String(100), nullable=False, unique=True)
    category = Column(String(50), nullable=False, default="PERSONNEL", index=True)
    unit_of_measure = Column(String(30), nullable=False)
    description = Column(Text, nullable=True)
    is_personnel = Column(Boolean, nullable=False, default=False)
    is_vehicle = Column(Boolean, nullable=False, default=False)
    is_team = Column(Boolean, nullable=False, default=False)
    is_equipment = Column(Boolean, nullable=False, default=False)
    is_infrastructure = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Aliases for convenience
    @property
    def name(self):
        return self.resource_name

    @property
    def unit(self):
        return self.unit_of_measure

    # Relationships
    costs = relationship("ResourceCost", back_populates="resource_type")
    district_resources = relationship("DistrictResource", back_populates="resource_type")
    state_resources = relationship("StateResource", back_populates="resource_type")
    recommendations = relationship("ResourceRecommendation", back_populates="resource_type")
    budget_estimations = relationship("BudgetEstimation", back_populates="resource_type")


class ResourceCost(Base):
    __tablename__ = "resource_costs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    resource_type_id = Column(Integer, ForeignKey("resource_types.id", ondelete="RESTRICT"), nullable=False, index=True)
    unit_cost = Column(DECIMAL(12, 2), nullable=False)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_cost_resource_active", "resource_type_id", "is_active"),
    )

    # Relationships
    resource_type = relationship("ResourceType", back_populates="costs")
    budget_estimations = relationship("BudgetEstimation", back_populates="cost_config")


class DistrictResource(Base):
    __tablename__ = "district_resources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="RESTRICT"), nullable=False, index=True)
    resource_type_id = Column(Integer, ForeignKey("resource_types.id", ondelete="RESTRICT"), nullable=False, index=True)
    actual_count = Column(Integer, nullable=True)
    sanctioned_count = Column(Integer, nullable=True)
    required_count = Column(Integer, nullable=True)
    gap_count = Column(Integer, nullable=True)
    available_quantity = Column(Integer, nullable=False, default=0)
    reference_year = Column(SmallInteger, nullable=False, default=2024, index=True)
    period_year = Column(SmallInteger, nullable=False, default=2024)
    period_month = Column(SmallInteger, nullable=False, default=1)
    data_status = Column(String(50), nullable=False, default="UNRECORDED", index=True)
    source_name = Column(String(150), nullable=True)
    source_url = Column(String(255), nullable=True)
    source_document = Column(String(255), nullable=True)
    source_page = Column(String(50), nullable=True)
    methodology = Column(String(100), nullable=True)
    confidence_score = Column(DECIMAL(4, 2), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("district_id", "resource_type_id", "reference_year", name="uq_district_resource_ref_year"),
    )

    # Relationships
    district = relationship("District", back_populates="resources")
    resource_type = relationship("ResourceType", back_populates="district_resources")


class StateResource(Base):
    __tablename__ = "state_resources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    state_id = Column(Integer, ForeignKey("states.id", ondelete="RESTRICT"), nullable=False, index=True)
    resource_type_id = Column(Integer, ForeignKey("resource_types.id", ondelete="RESTRICT"), nullable=False, index=True)
    sanctioned_quantity = Column(Integer, nullable=True)
    actual_quantity = Column(Integer, nullable=True)
    available_quantity = Column(Integer, nullable=False, default=0)
    actual_count = Column(Integer, nullable=True)
    sanctioned_count = Column(Integer, nullable=True)
    required_count = Column(Integer, nullable=True)
    gap_count = Column(Integer, nullable=True)
    reference_year = Column(SmallInteger, nullable=False, index=True)
    data_status = Column(String(50), nullable=False, default="OFFICIAL_STATE", index=True)
    source_name = Column(String(150), nullable=False)
    source_publication = Column(String(255), nullable=False)
    source_document = Column(String(255), nullable=True)
    source_page = Column(String(50), nullable=True)
    source_url = Column(String(255), nullable=True)
    source_geography = Column(String(50), nullable=False, default="STATE")
    data_as_of = Column(Date, nullable=False)
    methodology = Column(String(100), nullable=True)
    confidence_score = Column(DECIMAL(4, 2), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("state_id", "resource_type_id", "reference_year", name="uq_state_res_period"),
    )

    # Relationships
    state = relationship("State", back_populates="state_resources")
    resource_type = relationship("ResourceType", back_populates="state_resources")
