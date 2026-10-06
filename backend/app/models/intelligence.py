from sqlalchemy import Column, Integer, BigInteger, SmallInteger, String, Text, Enum, DECIMAL, ForeignKey, TIMESTAMP, UniqueConstraint, Index, JSON, func
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class CrimeRiskScore(Base):
    __tablename__ = "crime_risk_scores"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="RESTRICT"), nullable=False)
    period_year = Column(SmallInteger, nullable=False)
    period_month = Column(SmallInteger, nullable=False)
    overall_risk_score = Column(DECIMAL(5, 2), nullable=False)
    risk_level = Column(
        Enum("LOW", "MODERATE", "HIGH", "CRITICAL", name="risk_level_enum"),
        nullable=False,
    )
    severity_index = Column(DECIMAL(5, 2), nullable=False)
    trend_index = Column(DECIMAL(5, 2), nullable=False)
    volume_index = Column(DECIMAL(5, 2), nullable=False)
    forecast_index = Column(DECIMAL(5, 2), nullable=True)
    rate_index = Column(DECIMAL(5, 2), nullable=True)
    model_id = Column(Integer, ForeignKey("ml_models.id", ondelete="SET NULL"), nullable=True)
    model_version = Column(String(20), nullable=True)
    factor_contributions = Column(JSON, nullable=True)
    strongest_driver = Column(String(50), nullable=True)
    population_density_factor = Column(DECIMAL(5, 2), nullable=False)
    calculation_version = Column(String(20), nullable=False, default="risk-v1.0")
    generated_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("district_id", "period_year", "period_month", "calculation_version", name="uq_district_risk_period_version"),
        Index("idx_risk_period", "period_year", "period_month", "overall_risk_score"),
    )

    # Relationships
    district = relationship("District", back_populates="risk_scores")
    model = relationship("MLModel")


class ResourceRecommendation(Base):
    __tablename__ = "resource_recommendations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="RESTRICT"), nullable=False)
    resource_type_id = Column(Integer, ForeignKey("resource_types.id", ondelete="RESTRICT"), nullable=False)
    period_year = Column(SmallInteger, nullable=False)
    period_month = Column(SmallInteger, nullable=False)
    available_quantity = Column(Integer, nullable=False)
    recommended_quantity = Column(Integer, nullable=False)
    shortfall_quantity = Column(Integer, nullable=False)
    optimization_rationale = Column(Text, nullable=True)
    model_id = Column(Integer, ForeignKey("ml_models.id", ondelete="SET NULL"), nullable=True)
    generated_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("district_id", "resource_type_id", "period_year", "period_month", name="uq_district_resource_recom_period"),
        Index("idx_recom_period", "district_id", "period_year", "period_month"),
    )

    # Relationships
    district = relationship("District", back_populates="recommendations")
    resource_type = relationship("ResourceType", back_populates="recommendations")
    model = relationship("MLModel", back_populates="recommendations")


class BudgetEstimation(Base):
    __tablename__ = "budget_estimations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="RESTRICT"), nullable=False)
    resource_type_id = Column(Integer, ForeignKey("resource_types.id", ondelete="RESTRICT"), nullable=False)
    period_year = Column(SmallInteger, nullable=False)
    period_month = Column(SmallInteger, nullable=False)
    recommended_units = Column(Integer, nullable=False)
    unit_cost = Column(DECIMAL(12, 2), nullable=False)
    estimated_total_cost = Column(DECIMAL(14, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    cost_config_id = Column(Integer, ForeignKey("resource_costs.id", ondelete="RESTRICT"), nullable=False)
    generated_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("district_id", "resource_type_id", "period_year", "period_month", name="uq_district_budget_period"),
    )

    # Relationships
    district = relationship("District", back_populates="budget_estimations")
    resource_type = relationship("ResourceType", back_populates="budget_estimations")
    cost_config = relationship("ResourceCost", back_populates="budget_estimations")
