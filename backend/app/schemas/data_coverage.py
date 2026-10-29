"""
Phase 3 Data Coverage & Provenance Schema.

Provides structured models to distinguish:
- DIRECT_OBSERVATION (Census 2011 baseline districts with verified ground observations)
- PARENT_DERIVED (Modern carved districts inheriting parent baselines with verified lineage)
- SIMULATED_TEST (Isolated synthetic test data, never mixed into production analytics)
- UNAVAILABLE (Missing ground rosters or unrecorded observations, strictly preserved as NULL/404)
"""

from enum import Enum
from typing import Dict, Optional, List
from pydantic import BaseModel, ConfigDict


class DataCoverageTier(str, Enum):
    DIRECT_OBSERVATION = "DIRECT_OBSERVATION"
    PARENT_DERIVED = "PARENT_DERIVED"
    SIMULATED_TEST = "SIMULATED_TEST"
    UNAVAILABLE = "UNAVAILABLE"


class DomainCoverageDetail(BaseModel):
    domain: str
    tier: DataCoverageTier
    record_count: int
    source_district_id: int
    source_district_name: str
    is_derived: bool
    provenance_note: str

    model_config = ConfigDict(from_attributes=True)


class DistrictCoverageReport(BaseModel):
    district_id: int
    district_name: str
    state_id: int
    state_name: str
    is_census_2011: bool
    is_current_admin: bool
    parent_district_id: Optional[int] = None
    parent_district_name: Optional[str] = None
    domains: Dict[str, DomainCoverageDetail]
    summary: str

    model_config = ConfigDict(from_attributes=True)


class NationwideCoverageSummary(BaseModel):
    total_districts: int
    census_2011_districts: int
    carved_districts: int
    active_current_districts: int
    tier_breakdown: Dict[str, Dict[str, int]]
    disclaimer: str

    model_config = ConfigDict(from_attributes=True)

