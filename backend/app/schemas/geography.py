from pydantic import BaseModel, ConfigDict
from typing import List, Optional


class StateItem(BaseModel):
    id: int
    state_name: str
    state_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class StateListResponse(BaseModel):
    total: int
    items: List[StateItem]


class DistrictItem(BaseModel):
    id: int
    state_id: int
    state_name: str
    district_name: str
    census_district_code: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class DistrictListResponse(BaseModel):
    total: int
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
    demographics: Optional[DistrictDemographicsData] = None

    model_config = ConfigDict(from_attributes=True)
