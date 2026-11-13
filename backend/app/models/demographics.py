from sqlalchemy import Column, Integer, BigInteger, SmallInteger, Boolean, String, ForeignKey, TIMESTAMP, func
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class DistrictDemographics(Base):
    __tablename__ = "district_demographics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="CASCADE"), nullable=False, unique=True)
    census_year = Column(SmallInteger, nullable=False, default=2011)
    is_derived = Column(Boolean, default=False)
    data_provenance = Column(String(60), default="OFFICIAL_CENSUS_2011")
    derived_source = Column(String(150), nullable=True)
    total_population = Column(BigInteger, nullable=True)
    male_population = Column(BigInteger, nullable=True)
    female_population = Column(BigInteger, nullable=True)
    literate_population = Column(BigInteger, nullable=True)
    total_workers = Column(BigInteger, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Relationships
    district = relationship("District", back_populates="demographics")
