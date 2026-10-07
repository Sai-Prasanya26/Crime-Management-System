from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, UniqueConstraint, TIMESTAMP, Date, Numeric, Text, func
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class State(Base):
    __tablename__ = "states"

    id = Column(Integer, primary_key=True, autoincrement=True)
    state_name = Column(String(100), nullable=False, unique=True, index=True)
    state_code = Column(String(10), nullable=True)
    entity_type = Column(Enum("STATE", "UT", name="entity_type_enum"), nullable=False, default="STATE")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    districts = relationship("District", back_populates="state", cascade="all, delete-orphan")
    state_resources = relationship("StateResource", back_populates="state")


class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    state_id = Column(Integer, ForeignKey("states.id", ondelete="RESTRICT"), nullable=False, index=True)
    district_name = Column(String(100), nullable=False, index=True)
    census_district_code = Column(Integer, nullable=True, unique=True)
    lgd_code = Column(Integer, nullable=True)
    is_census_2011 = Column(Boolean, nullable=False, default=False)
    is_current_admin = Column(Boolean, nullable=False, default=True)
    parent_district_id = Column(Integer, ForeignKey("districts.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("state_id", "district_name", name="uq_state_district"),
    )

    # Relationships
    state = relationship("State", back_populates="districts")
    parent_district = relationship("District", remote_side=[id], backref="child_districts")
    demographics = relationship("DistrictDemographics", back_populates="district", uselist=False, cascade="all, delete-orphan")
    incidents = relationship("CrimeIncident", back_populates="district")
    resources = relationship("DistrictResource", back_populates="district")
    predictions = relationship("CrimePrediction", back_populates="district")
    risk_scores = relationship("CrimeRiskScore", back_populates="district")
    recommendations = relationship("ResourceRecommendation", back_populates="district")
    budget_estimations = relationship("BudgetEstimation", back_populates="district")
    reports = relationship("GeneratedReport", back_populates="district")


class DistrictGeographyMapping(Base):
    __tablename__ = "district_geography_mapping"

    id = Column(Integer, primary_key=True, autoincrement=True)
    historical_district_id = Column(Integer, ForeignKey("districts.id", ondelete="CASCADE"), nullable=False, index=True)
    current_district_id = Column(Integer, ForeignKey("districts.id", ondelete="CASCADE"), nullable=False, index=True)
    mapping_type = Column(
        Enum("SAME", "SPLIT", "MERGED", "TRANSFERRED", "RENAMED", "REORGANIZED", name="mapping_type_enum"),
        nullable=False,
    )
    mapping_percentage = Column(Numeric(5, 2), nullable=True)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    source = Column(String(150), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Relationships
    historical_district = relationship("District", foreign_keys=[historical_district_id])
    current_district = relationship("District", foreign_keys=[current_district_id])
