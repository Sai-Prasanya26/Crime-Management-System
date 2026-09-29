from sqlalchemy import Column, Integer, BigInteger, String, Boolean, Date, DateTime, DECIMAL, ForeignKey, TIMESTAMP, UniqueConstraint, Index, JSON, func
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class MLModel(Base):
    __tablename__ = "ml_models"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(100), nullable=False)
    model_type = Column(String(50), nullable=False)
    version = Column(String(20), nullable=False)
    algorithm = Column(String(100), nullable=False)
    evaluation_metrics = Column(JSON, nullable=False)
    training_date = Column(DateTime, nullable=False)
    dataset_snapshot = Column(String(100), nullable=False)
    artifact_path = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("model_name", "version", name="uq_model_name_version"),
    )

    # Relationships
    predictions = relationship("CrimePrediction", back_populates="model")
    recommendations = relationship("ResourceRecommendation", back_populates="model")


class CrimePrediction(Base):
    __tablename__ = "crime_predictions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="RESTRICT"), nullable=False)
    crime_type_id = Column(Integer, ForeignKey("crime_types.id", ondelete="SET NULL"), nullable=True)
    model_id = Column(Integer, ForeignKey("ml_models.id", ondelete="RESTRICT"), nullable=False)
    prediction_date = Column(Date, nullable=False, index=True)
    predicted_crime_count = Column(DECIMAL(10, 2), nullable=False)
    confidence_lower = Column(DECIMAL(10, 2), nullable=True)
    confidence_upper = Column(DECIMAL(10, 2), nullable=True)
    generated_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_pred_dist_date", "district_id", "prediction_date"),
    )

    # Relationships
    district = relationship("District", back_populates="predictions")
    crime_type = relationship("CrimeType", back_populates="predictions")
    model = relationship("MLModel", back_populates="predictions")
