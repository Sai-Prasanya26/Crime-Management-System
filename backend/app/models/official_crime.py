from sqlalchemy import Column, Integer, BigInteger, SmallInteger, String, Enum, ForeignKey, TIMESTAMP, Date, Numeric, Text, func
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class OfficialCrimeStatistic(Base):
    __tablename__ = "official_crime_statistics"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    state_id = Column(Integer, ForeignKey("states.id", ondelete="SET NULL"), nullable=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="SET NULL"), nullable=True)
    report_year = Column(SmallInteger, nullable=False, index=True)
    geography_level = Column(
        Enum("NATIONAL", "STATE", "DISTRICT", "CITY", name="geography_level_enum"),
        nullable=False,
        index=True,
    )
    entity_name = Column(String(100), nullable=False)
    crime_head = Column(String(100), nullable=False)
    crime_category = Column(String(100), nullable=False)
    reported_cases = Column(Integer, nullable=False)
    chargesheeted_cases = Column(Integer, nullable=True)
    chargesheet_rate = Column(Numeric(5, 2), nullable=True)
    conviction_rate = Column(Numeric(5, 2), nullable=True)
    source_name = Column(String(150), nullable=False)
    source_report = Column(String(150), nullable=False)
    source_url = Column(String(255), nullable=False)
    publication_date = Column(Date, nullable=True)
    data_status = Column(String(50), nullable=False, default="OFFICIAL_PUBLISHED")
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Relationships
    state = relationship("State")
    district = relationship("District")
