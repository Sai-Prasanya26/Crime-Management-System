from sqlalchemy.orm import Session
from typing import Optional, List
from backend.app.repositories.official_crime_repository import OfficialCrimeRepository
from backend.app.schemas.official_crime import (
    OfficialCrimeStatisticListResponse,
    OfficialCrimeStatisticItem,
)


class OfficialCrimeService:
    @staticmethod
    def get_statistics(
        db: Session,
        report_year: Optional[int] = None,
        geography_level: Optional[str] = None,
        state_id: Optional[int] = None,
        crime_head: Optional[str] = None,
    ) -> OfficialCrimeStatisticListResponse:
        stats = OfficialCrimeRepository.get_statistics(
            db,
            report_year=report_year,
            geography_level=geography_level,
            state_id=state_id,
            crime_head=crime_head,
        )
        items = [
            OfficialCrimeStatisticItem(
                id=s.id,
                state_id=s.state_id,
                district_id=s.district_id,
                report_year=s.report_year,
                geography_level=s.geography_level,
                entity_name=s.entity_name,
                crime_head=s.crime_head,
                crime_category=s.crime_category,
                reported_cases=s.reported_cases,
                chargesheeted_cases=s.chargesheeted_cases,
                chargesheet_rate=float(s.chargesheet_rate) if s.chargesheet_rate is not None else None,
                conviction_rate=float(s.conviction_rate) if s.conviction_rate is not None else None,
                source_name=s.source_name,
                source_report=s.source_report,
                source_url=s.source_url,
                publication_date=s.publication_date,
                data_status=s.data_status,
                notes=s.notes,
            )
            for s in stats
        ]
        return OfficialCrimeStatisticListResponse(
            total=len(items),
            report_year=report_year,
            geography_level=geography_level,
            items=items,
        )

    @staticmethod
    def get_available_years(db: Session) -> List[int]:
        return OfficialCrimeRepository.get_available_years(db)
