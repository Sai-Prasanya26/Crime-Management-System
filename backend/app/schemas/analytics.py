from pydantic import BaseModel
from typing import List, Dict, Optional


class CaseStatusBreakdown(BaseModel):
    closed: int
    open: int
    clearance_rate_pct: float


class CrimeOverviewResponse(BaseModel):
    total_incidents: int
    total_districts: int
    total_states: int
    total_crime_types: int
    total_crime_categories: int
    cases: CaseStatusBreakdown
    earliest_incident_date: str
    latest_incident_date: str
    filtered_by_state_id: Optional[int] = None
    filtered_by_district_id: Optional[int] = None


class TrendItem(BaseModel):
    period: str
    incident_count: int


class TrendResponse(BaseModel):
    interval: str
    total_points: int
    items: List[TrendItem]


class CategoryBreakdownItem(BaseModel):
    category_id: int
    category_name: str
    severity_weight: float
    incident_count: int
    percentage: float


class CategoryBreakdownResponse(BaseModel):
    total_incidents: int
    items: List[CategoryBreakdownItem]


class TypeBreakdownItem(BaseModel):
    crime_type_id: int
    crime_code: str
    crime_name: str
    category_name: str
    severity_level: str
    incident_count: int
    percentage: float


class TypeBreakdownResponse(BaseModel):
    total_incidents: int
    items: List[TypeBreakdownItem]


class HourlyDistributionItem(BaseModel):
    hour: int
    incident_count: int
    percentage: float


class HourlyDistributionResponse(BaseModel):
    peak_hour: int
    items: List[HourlyDistributionItem]


class VictimDemographicsResponse(BaseModel):
    gender_distribution: Dict[str, int]
    age_distribution: Dict[str, int]
    average_age: Optional[float] = None


class WeaponDistributionItem(BaseModel):
    weapon_name: str
    incident_count: int
    percentage: float


class WeaponDistributionResponse(BaseModel):
    total_incidents: int
    items: List[WeaponDistributionItem]


class TopDistrictItem(BaseModel):
    district_id: int
    district_name: str
    state_name: str
    incident_count: int
    total_population: Optional[int] = None
    crime_rate_per_100k: Optional[float] = None


class TopDistrictsResponse(BaseModel):
    metric: str
    items: List[TopDistrictItem]
