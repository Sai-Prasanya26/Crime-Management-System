from sqlalchemy import Column, Integer, SmallInteger, String, Enum, ForeignKey, TIMESTAMP, Index, func
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    report_title = Column(String(150), nullable=False)
    report_type = Column(
        Enum("DISTRICT_INTELLIGENCE", "RESOURCE_OPTIMIZATION", "BUDGET_ESTIMATION", "EXECUTIVE_SUMMARY", name="report_type_enum"),
        nullable=False,
    )
    generated_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="SET NULL"), nullable=True)
    period_year = Column(SmallInteger, nullable=False)
    period_month = Column(SmallInteger, nullable=True)
    file_path = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    generated_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_report_type_period", "report_type", "period_year", "period_month"),
    )

    # Relationships
    author = relationship("User", back_populates="reports")
    district = relationship("District", back_populates="reports")
