from sqlalchemy import Column, Integer, BigInteger, SmallInteger, ForeignKey, TIMESTAMP, func
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class DistrictDemographics(Base):
    __tablename__ = "district_demographics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="CASCADE"), nullable=False, unique=True)
    census_year = Column(SmallInteger, nullable=False, default=2011)
    total_population = Column(BigInteger, nullable=False)
    male_population = Column(BigInteger, nullable=False)
    female_population = Column(BigInteger, nullable=False)
    literate_population = Column(BigInteger, nullable=False)
    total_workers = Column(BigInteger, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Relationships
    district = relationship("District", back_populates="demographics")
