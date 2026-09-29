from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class State(Base):
    __tablename__ = "states"

    id = Column(Integer, primary_key=True, autoincrement=True)
    state_name = Column(String(100), nullable=False, unique=True, index=True)
    state_code = Column(String(10), nullable=True)

    # Relationships
    districts = relationship("District", back_populates="state", cascade="all, delete-orphan")


class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    state_id = Column(Integer, ForeignKey("states.id", ondelete="RESTRICT"), nullable=False, index=True)
    district_name = Column(String(100), nullable=False, index=True)
    census_district_code = Column(Integer, nullable=True, unique=True)

    __table_args__ = (
        UniqueConstraint("state_id", "district_name", name="uq_state_district"),
    )

    # Relationships
    state = relationship("State", back_populates="districts")
    demographics = relationship("DistrictDemographics", back_populates="district", uselist=False, cascade="all, delete-orphan")
    incidents = relationship("CrimeIncident", back_populates="district")
    resources = relationship("DistrictResource", back_populates="district")
    predictions = relationship("CrimePrediction", back_populates="district")
    risk_scores = relationship("CrimeRiskScore", back_populates="district")
    recommendations = relationship("ResourceRecommendation", back_populates="district")
    budget_estimations = relationship("BudgetEstimation", back_populates="district")
    reports = relationship("GeneratedReport", back_populates="district")
