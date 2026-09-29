from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
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


class StateCoverageItem(BaseModel):
    state_id: int
    state_name: str
    entity_type: str
    district_count: int
    historical_incident_count: int
    official_record_count: int
    latest_official_crime_year: Optional[int] = None
    latest_official_cases: Optional[int] = None
    official_data_available: bool
    data_status: str
    coverage_status: str
    data_source: str
    data_freshness: str
    has_crime_information: bool
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class StateCoverageListResponse(BaseModel):
    total_entities: int
    states_count: int
    uts_count: int
    total_current_districts: int
    total_historical_incidents: int
    coverage_summary: Dict[str, int]
    items: List[StateCoverageItem]


class DataFreshnessResponse(BaseModel):
    historical_incident_dataset: str
    latest_nationwide_official_benchmark: str
    latest_official_nationwide_year: int
    population_baseline: str
    current_administrative_geography: str
    total_active_states: int
    total_active_uts: int
    total_current_districts: int
    total_census_2011_districts: int
    total_historical_incidents: int
    total_official_records: int
    notes: List[str]


class DistrictCoverageItem(BaseModel):
    district_id: int
    district_name: str
    state_id: int
    state_name: str
    parent_district_id: Optional[int] = None
    parent_district_name: Optional[str] = None
    is_census_2011: bool
    is_current_admin: bool
    has_historical_incidents: bool
    historical_incident_count: int
    has_official_statistics: bool
    latest_data_year: Optional[int] = None
    data_source: str
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DistrictCoverageListResponse(BaseModel):
    total: int
    items: List[DistrictCoverageItem]
