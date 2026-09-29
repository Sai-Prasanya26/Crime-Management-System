from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import date


class OfficialCrimeStatisticItem(BaseModel):
    id: int
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    report_year: int
    geography_level: str
    entity_name: str
    crime_head: str
    crime_category: str
    reported_cases: int
    chargesheeted_cases: Optional[int] = None
    chargesheet_rate: Optional[float] = None
    conviction_rate: Optional[float] = None
    source_name: str
    source_report: str
    source_url: str
    publication_date: Optional[date] = None
    data_status: str
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class OfficialCrimeStatisticListResponse(BaseModel):
    total: int
    report_year: Optional[int] = None
    geography_level: Optional[str] = None
    items: List[OfficialCrimeStatisticItem]
