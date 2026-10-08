"""
Pydantic Schemas for Phase 7D: Official Resource Data Verification & Optimization Foundation.

Defines data transfer objects and interfaces for:
- Resource demand calculation interfaces (Crime -> Analytics -> Prediction -> Risk -> Demand)
- Resource shortfall interfaces (distinguishing official available vs calculated required vs recommended)
- Separation of concerns (Historical deployment vs Official availability vs Future demand vs Recommendations)
- State-level resource summaries and data freshness metadata
- Analytical comparison between historical crime burden and official resource availability
"""

from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Dict, Any


class GeographyContext(BaseModel):
    """Geographic scope for resource demand modeling."""
    geography_level: str = Field(..., description="Geography level: 'DISTRICT' or 'STATE'")
    geography_id: int = Field(..., description="Unique ID in districts or states table")
    geography_name: str = Field(..., description="Name of the administrative jurisdiction")
    population: int = Field(..., description="Census 2011 baseline population")
    population_density: Optional[float] = Field(None, description="Inhabitants per sq km where available")
    area_sq_km: Optional[float] = Field(None, description="Jurisdiction area in square kilometers")


class CrimeMetricsContext(BaseModel):
    """Historical crime intelligence metrics (2020-2025)."""
    total_incidents: int = Field(..., description="Total verified historical incidents in the window")
    severity_index: float = Field(..., description="IPC severity weighted index (0.0 to 1.0)")
    trend_index: float = Field(..., description="Quarterly longitudinal trend slope (-1.0 to 1.0)")
    category_breakdown: Dict[str, int] = Field(default_factory=dict, description="Incident volume by IPC crime category")
    historical_police_deployed_avg: Optional[float] = Field(
        None,
        description="Historical average officers logged per incident. CRITICAL: Incident-level historical artifact only, NOT current inventory!"
    )


class RiskMetricsContext(BaseModel):
    """Standardized production risk-v1.0 metrics."""
    overall_risk_score: float = Field(..., ge=0.0, le=100.0, description="Risk score on 0-100 scale")
    risk_level: str = Field(..., description="Risk tier: 'LOW', 'MODERATE', 'HIGH', or 'CRITICAL'")
    risk_multiplier: float = Field(..., description="Risk scaling factor computed from risk score")


class PredictionMetricsContext(BaseModel):
    """HGBR production forecasting metrics."""
    forecast_period: str = Field(..., description="Target forecast period date (YYYY-MM-DD)")
    predicted_crime_count: float = Field(..., ge=0.0, description="Point forecast of expected crimes")
    model_id: Optional[str] = Field("production_hgbr_v1", description="Model artifact identifier")


class ResourceDemandItem(BaseModel):
    """Derived resource requirement item."""
    resource_type_id: int
    resource_code: str
    resource_name: str
    category: str
    unit_of_measure: str
    calculated_required_quantity: int
    calculation_basis: str
    formula_identifier: Optional[str] = None


class ResourceDemandResult(BaseModel):
    """Structured demand output suitable for future optimizer consumption."""
    geography: GeographyContext
    period: str
    methodology_version: str = "demand-v1.0-foundation"
    demand_items: List[ResourceDemandItem]
    pipeline_stage: str = "STAGE_5_RESOURCE_DEMAND"
    generated_at: str


class ResourceShortfallItem(BaseModel):
    """
    Comparison between calculated demand and official inventory.
    Strictly preserves NULL for unrecorded ground inventories.
    """
    resource_type_id: int
    resource_code: str
    resource_name: str
    category: str
    unit_of_measure: str
    calculated_required_quantity: int
    official_available_quantity: Optional[int] = Field(
        None,
        description="Verified official inventory count. Exclusively NULL if ground data is UNRECORDED."
    )
    shortfall_quantity: Optional[int] = Field(
        None,
        description="max(required - available, 0). Exclusively NULL if official_available_quantity is NULL."
    )
    surplus_quantity: Optional[int] = Field(
        None,
        description="max(available - required, 0). Exclusively NULL if official_available_quantity is NULL."
    )
    recommended_quantity: Optional[int] = Field(
        None,
        description="Optimization allocation output. Intentionally None in Phase 7D (Optimization foundation)."
    )
    data_status: str = Field(
        ...,
        description="'OFFICIAL_RECORDED' if backed by government gazette, else 'UNRECORDED'"
    )
    source_provenance: Optional[Dict[str, Any]] = None
    integrity_note: str


class ResourceShortfallResult(BaseModel):
    """Structured shortfall assessment object."""
    geography: GeographyContext
    period: str
    methodology_version: str = "shortfall-v1.0-foundation"
    items: List[ResourceShortfallItem]
    pipeline_stage: str = "STAGE_7_RESOURCE_SHORTFALL"
    generated_at: str


class ResourceTypeSummaryResponse(BaseModel):
    """Resource type master data."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: Optional[str] = None
    resource_name: str
    category: str
    unit_of_measure: str
    description: Optional[str] = None
    is_personnel: bool
    is_vehicle: bool
    is_team: bool
    is_equipment: bool
    is_infrastructure: bool
    is_active: bool


class StateResourceSummaryItem(BaseModel):
    """Individual resource availability entry for state summary."""
    resource_type: str
    category: str
    available_quantity: int
    actual_quantity: Optional[int] = None
    sanctioned_quantity: Optional[int] = None
    unit: str


class StateResourceGroupedSummary(BaseModel):
    """Grouped state-level official police resource summary."""
    state_id: int
    state: str
    reference_year: int
    source: str
    source_publication: str
    source_url: Optional[str] = None
    geography_level: str = "State/UT"
    coverage_status: str
    resources: List[StateResourceSummaryItem]


class ResourceSummaryResponse(BaseModel):
    """Full official resource summary across states with data freshness metadata."""
    total_states: int
    data_freshness_notes: Dict[str, str]
    items: List[StateResourceGroupedSummary]


class StateCrimeResourceComparisonItem(BaseModel):
    """State-level comparative metrics linking crime burden to official resources."""
    state_id: int
    state_name: str
    census_2011_population: int
    total_crime_incidents: int
    crime_rate_per_100k: float
    police_personnel: Optional[int] = None
    police_per_100k: Optional[float] = None
    police_vehicles: Optional[int] = None
    vehicles_per_100k: Optional[float] = None
    police_stations: Optional[int] = None
    stations_per_100k: Optional[float] = None
    personnel_ref_year: int = 2020
    vehicles_ref_year: int = 2024
    stations_ref_year: int = 2024
    historical_crime_years: str = "2020-2025"
    analytical_notice: str = (
        "Analytical comparison only. Does not infer causality between police resource levels and reported crime rates."
    )


class ResourceCrimeComparisonResponse(BaseModel):
    """Response containing comparative intelligence between crime burden and resources."""
    comparison_period: str = "2020-2025 historical crime vs 2020/2024 official police resources"
    crime_data_span: str = "2020-2025 (191,679 incidents)"
    resource_reference_years: Dict[str, int]
    disclaimer: str = (
        "Non-causal analytical benchmark. Operational capacity metrics are displayed for resource planning only."
    )
    items: List[StateCrimeResourceComparisonItem]
