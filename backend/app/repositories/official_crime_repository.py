from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from backend.app.models.official_crime import OfficialCrimeStatistic


class OfficialCrimeRepository:
    @staticmethod
    def get_statistics(
        db: Session,
        report_year: Optional[int] = None,
        geography_level: Optional[str] = None,
        state_id: Optional[int] = None,
        crime_head: Optional[str] = None,
    ) -> List[OfficialCrimeStatistic]:
        query = db.query(OfficialCrimeStatistic).options(
            joinedload(OfficialCrimeStatistic.state),
            joinedload(OfficialCrimeStatistic.district),
        )

        if report_year is not None:
            query = query.filter(OfficialCrimeStatistic.report_year == report_year)
        if geography_level is not None:
            query = query.filter(OfficialCrimeStatistic.geography_level == geography_level.upper())
        if state_id is not None:
            query = query.filter(OfficialCrimeStatistic.state_id == state_id)
        if crime_head is not None:
            query = query.filter(OfficialCrimeStatistic.crime_head.ilike(f"%{crime_head}%"))

        return query.order_by(
            OfficialCrimeStatistic.report_year.desc(),
            OfficialCrimeStatistic.reported_cases.desc(),
        ).all()

    @staticmethod
    def get_available_years(db: Session) -> List[int]:
        rows = (
            db.query(OfficialCrimeStatistic.report_year)
            .distinct()
            .order_by(OfficialCrimeStatistic.report_year.desc())
            .all()
        )
        return [r[0] for r in rows]
