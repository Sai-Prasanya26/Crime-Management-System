from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import date


class StateItem(BaseModel):
    id: int
    state_name: str
    state_code: Optional[str] = None
    entity_type: Optional[str] = "STATE"
    is_active: Optional[bool] = True

    model_config = ConfigDict(from_attributes=True)


class StateListResponse(BaseModel):
    total: int
    view: Optional[str] = "current"
    items: List[StateItem]


class DistrictItem(BaseModel):
    id: int
    state_id: int
    state_name: str
    district_name: str
    census_district_code: Optional[int] = None
    lgd_code: Optional[int] = None
    is_census_2011: Optional[bool] = False
    is_current_admin: Optional[bool] = True
    parent_district_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class DistrictListResponse(BaseModel):
    total: int
    view: Optional[str] = "current"
    items: List[DistrictItem]


class DistrictDemographicsData(BaseModel):
    census_year: int
    total_population: int
    male_population: int
    female_population: int
    literate_population: int
    total_workers: int

    model_config = ConfigDict(from_attributes=True)


class DistrictDetailResponse(BaseModel):
    id: int
    state_id: int
    state_name: str
    district_name: str
    census_district_code: Optional[int] = None
    lgd_code: Optional[int] = None
    is_census_2011: Optional[bool] = False
    is_current_admin: Optional[bool] = True
    parent_district_id: Optional[int] = None
    demographics: Optional[DistrictDemographicsData] = None

    model_config = ConfigDict(from_attributes=True)


class DistrictGeographyMappingItem(BaseModel):
    id: int
    historical_district_id: int
    historical_district_name: Optional[str] = None
    historical_state_name: Optional[str] = None
    current_district_id: int
    current_district_name: Optional[str] = None
    current_state_name: Optional[str] = None
    mapping_type: str
    mapping_percentage: Optional[float] = None
    effective_from: date
    effective_to: Optional[date] = None
    source: str
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DistrictGeographyMappingListResponse(BaseModel):
    total: int
    items: List[DistrictGeographyMappingItem]
