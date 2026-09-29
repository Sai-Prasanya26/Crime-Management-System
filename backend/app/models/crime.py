from sqlalchemy import Column, Integer, BigInteger, SmallInteger, String, Date, Time, Enum, DECIMAL, ForeignKey, TIMESTAMP, Index, func
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class CrimeCategory(Base):
    __tablename__ = "crime_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category_name = Column(String(50), nullable=False, unique=True)
    severity_weight = Column(DECIMAL(3, 2), nullable=False, default=1.00)

    # Relationships
    crime_types = relationship("CrimeType", back_populates="category")


class CrimeType(Base):
    __tablename__ = "crime_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("crime_categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    crime_code = Column(String(20), nullable=False, unique=True)
    crime_name = Column(String(100), nullable=False)
    severity_level = Column(
        Enum("LOW", "MEDIUM", "HIGH", "CRITICAL", name="crime_severity_level"),
        nullable=False,
        default="MEDIUM",
    )

    # Relationships
    category = relationship("CrimeCategory", back_populates="crime_types")
    incidents = relationship("CrimeIncident", back_populates="crime_type")
    predictions = relationship("CrimePrediction", back_populates="crime_type")


class CrimeIncident(Base):
    __tablename__ = "crime_incidents"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    report_number = Column(String(50), nullable=False, unique=True)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="RESTRICT"), nullable=False, index=True)
    crime_type_id = Column(Integer, ForeignKey("crime_types.id", ondelete="RESTRICT"), nullable=False, index=True)
    incident_date = Column(Date, nullable=False, index=True)
    incident_time = Column(Time, nullable=False)
    reported_date = Column(Date, nullable=False)
    victim_age = Column(SmallInteger, nullable=True)
    victim_gender = Column(
        Enum("M", "F", "OTHER", "UNKNOWN", name="victim_gender_enum"),
        nullable=False,
        default="UNKNOWN",
    )
    weapon_used = Column(String(50), nullable=True)
    police_deployed_count = Column(SmallInteger, nullable=False, default=0)
    case_status = Column(
        Enum("OPEN", "CLOSED", name="case_status_enum"),
        nullable=False,
        default="OPEN",
    )
    closed_date = Column(Date, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_incident_district_date", "district_id", "incident_date"),
        Index("idx_incident_type_date", "crime_type_id", "incident_date"),
    )

    # Relationships
    district = relationship("District", back_populates="incidents")
    crime_type = relationship("CrimeType", back_populates="incidents")
