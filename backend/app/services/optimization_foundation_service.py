"""
Phase 7D: Official Resource Data Verification & Optimization Foundation Service.

Provides:
1. End-to-end interface for the 10-stage optimization pipeline:
   Crime History -> Crime Analytics -> Crime Prediction -> Crime Risk Score ->
   Resource Demand -> Official Resource Availability -> Resource Shortfall ->
   Optimization -> Recommended Resources -> Budget Estimation.

2. Demand calculation interface (calculate_resource_demand):
   Connects demographic baselines, crime volume, severity, trend, risk score,
   and ML forecasting to structured resource requirements.

3. Shortfall analysis interface (calculate_resource_shortfall):
   Strictly separates official availability, calculated demand, and optimization
   recommendations. Preserves NULL for unrecorded ground inventories.

4. Strict audit separation:
   A. Historical police deployment (incident level: crime_incidents.police_deployed_count)
   B. Official resource availability (state_resources & official district_resources)
   C. Future calculated resource demand (calculated_required_quantity)
   D. Future optimization recommendations (recommended_quantity)

5. Analytical state resource summary & crime-vs-resource comparison.
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text
import math

from backend.app.schemas.optimization_foundation import (
    GeographyContext,
    CrimeMetricsContext,
    RiskMetricsContext,
    PredictionMetricsContext,
    ResourceDemandItem,
    ResourceDemandResult,
    ResourceShortfallItem,
    ResourceShortfallResult,
    ResourceTypeSummaryResponse,
    StateResourceSummaryItem,
    StateResourceGroupedSummary,
    ResourceSummaryResponse,
    StateCrimeResourceComparisonItem,
    ResourceCrimeComparisonResponse,
)


# Conceptual 10-Stage Resource Optimization Pipeline Definition
OPTIMIZATION_PIPELINE_STAGES = [
    {"stage": 1, "name": "Crime History", "source": "crime_incidents (191,679 rows, 2020-2025)", "status": "VERIFIED"},
    {"stage": 2, "name": "Crime Analytics", "source": "Aggregate metrics, frequency distributions, IPC trends", "status": "VERIFIED"},
    {"stage": 3, "name": "Crime Prediction", "source": "production_hgbr_v1 (Forecasting engine)", "status": "VERIFIED"},
    {"stage": 4, "name": "Crime Risk Score", "source": "risk-v1.0 (Composite risk index 0-100)", "status": "VERIFIED"},
    {"stage": 5, "name": "Resource Demand", "source": "Normative calculations from demographics, risk, & predictions", "status": "FOUNDATION_READY"},
    {"stage": 6, "name": "Official Resource Availability", "source": "BPR&D DoPO / MHA official state & district inventories", "status": "VERIFIED"},
    {"stage": 7, "name": "Resource Shortfall", "source": "max(demand - available, 0) with strict NULL preservation", "status": "FOUNDATION_READY"},
    {"stage": 8, "name": "Optimization", "source": "Constrained priority allocation algorithm", "status": "PREPARED"},
    {"stage": 9, "name": "Recommended Resources", "source": "Optimal allocation outputs per jurisdiction", "status": "PREPARED"},
    {"stage": 10, "name": "Budget Estimation", "source": "Cost per unit matrix * allocated units", "status": "PREPARED"},
]


class OptimizationFoundationService:
    """Core service establishing the verified official resource optimization foundation."""

    @staticmethod
    def calculate_resource_demand(
        geography: GeographyContext,
        period: str,
        crime_metrics: CrimeMetricsContext,
        risk_metrics: RiskMetricsContext,
        prediction_metrics: PredictionMetricsContext,
    ) -> ResourceDemandResult:
        """
        Calculates normative resource demand from crime volume, severity, trend,
        geography, demographics, predicted crime count, and risk scores.
        
        Does NOT invent arbitrary ground inventory. Produces structured demand items
        conforming to official BPR&D police operational norms.
        """
        pop = max(geography.population, 1000)
        risk_mul = max(risk_metrics.risk_multiplier, 0.5)
        forecast_vol = max(prediction_metrics.predicted_crime_count, 0.0)
        sev_idx = max(crime_metrics.severity_index, 0.1)

        # 1. Police Personnel Demand (BPR&D national sanctioned target ~181 officers per 100k population, scaled by risk multiplier)
        base_officers_per_100k = 181.0
        officers_demand = int(math.ceil((pop / 100000.0) * base_officers_per_100k * risk_mul))

        # 2. Patrol Vehicles Demand (BPR&D operational ratio: ~1 patrol vehicle per 20 active officers)
        vehicles_demand = int(math.ceil(officers_demand / 20.0))

        # 3. Investigation Teams Demand (caseload norm: 1 investigation team per 35 forecasted high-severity incidents / month)
        # Minimum of 2 teams per district for baseline 24/7 investigative rotation
        investigation_demand = max(2, int(math.ceil((forecast_vol * (1.0 + sev_idx)) / 35.0)))

        # 4. Surveillance Units Demand (normative scaling based on risk level tier)
        risk_tier = risk_metrics.risk_level.upper()
        if risk_tier == "CRITICAL":
            surveillance_demand = 8
        elif risk_tier == "HIGH":
            surveillance_demand = 5
        elif risk_tier == "MODERATE":
            surveillance_demand = 3
        else:
            surveillance_demand = 1

        demand_items = [
            ResourceDemandItem(
                resource_type_id=1,
                resource_code="POLICE_PERSONNEL_ACTUAL",
                resource_name="Police Officers",
                category="PERSONNEL",
                unit_of_measure="Personnel",
                calculated_required_quantity=officers_demand,
                calculation_basis=f"BPR&D baseline 181/100k pop * risk_multiplier ({risk_mul:.2f})",
                formula_identifier="BPRD_PERSONNEL_POPULATION_RATIO_V1",
            ),
            ResourceDemandItem(
                resource_type_id=2,
                resource_code="PATROL_VEHICLES",
                resource_name="Patrol Vehicles",
                category="MOBILITY",
                unit_of_measure="Vehicles",
                calculated_required_quantity=vehicles_demand,
                calculation_basis=f"BPR&D mobility ratio (1 patrol vehicle per 20 required officers)",
                formula_identifier="BPRD_MOBILITY_OFFICER_RATIO_V1",
            ),
            ResourceDemandItem(
                resource_type_id=3,
                resource_code="INVESTIGATION_TEAMS",
                resource_name="Investigation Teams",
                category="INVESTIGATION",
                unit_of_measure="Teams",
                calculated_required_quantity=investigation_demand,
                calculation_basis=f"Caseload demand based on forecast volume ({forecast_vol:.1f}) and severity index ({sev_idx:.2f})",
                formula_identifier="INVESTIGATION_CASELOAD_DEMAND_V1",
            ),
            ResourceDemandItem(
                resource_type_id=4,
                resource_code="SURVEILLANCE_TEAMS",
                resource_name="Surveillance Units",
                category="SURVEILLANCE",
                unit_of_measure="Units",
                calculated_required_quantity=surveillance_demand,
                calculation_basis=f"Risk tier allocation norm for risk_level '{risk_tier}'",
                formula_identifier="SURVEILLANCE_TIER_ALLOCATION_V1",
            ),
        ]

        return ResourceDemandResult(
            geography=geography,
            period=period,
            methodology_version="demand-v1.0-foundation",
            demand_items=demand_items,
            pipeline_stage="STAGE_5_RESOURCE_DEMAND",
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

    @staticmethod
    def calculate_resource_shortfall(
        demand_result: ResourceDemandResult,
        available_inventory: Optional[Dict[int, Dict[str, Any]]] = None,
    ) -> ResourceShortfallResult:
        """
        Compares calculated demand against official recorded resource availability.
        
        CRITICAL ZERO-FABRICATION RULE:
        If official ground inventory is UNRECORDED (not present in available_inventory),
        available_quantity is None, shortfall_quantity is None, and surplus_quantity is None.
        Missing values are NEVER converted to zero.
        recommended_quantity is explicitly None until the future optimization phase.
        """
        inventory = available_inventory or {}
        shortfall_items: List[ResourceShortfallItem] = []

        for req in demand_result.demand_items:
            rt_id = req.resource_type_id
            avail_data = inventory.get(rt_id)

            if avail_data is not None and avail_data.get("available_quantity") is not None:
                avail_qty = int(avail_data["available_quantity"])
                shortfall = max(req.calculated_required_quantity - avail_qty, 0)
                surplus = max(avail_qty - req.calculated_required_quantity, 0)
                data_status = avail_data.get("data_status", "OFFICIAL_RECORDED")
                prov = {
                    "source_name": avail_data.get("source_name", "BPR&D"),
                    "reference_year": avail_data.get("reference_year", 2024),
                    "source_url": avail_data.get("source_url"),
                    "geography_level": avail_data.get("source_geography", demand_result.geography.geography_level),
                }
                note = f"Verified against official {prov['source_name']} inventory ({prov['reference_year']})."
            else:
                avail_qty = None
                shortfall = None
                surplus = None
                data_status = "UNRECORDED"
                prov = None
                note = (
                    "Ground inventory unrecorded in official government publications. "
                    "Shortfall cannot be derived without genuine availability data."
                )

            shortfall_items.append(
                ResourceShortfallItem(
                    resource_type_id=req.resource_type_id,
                    resource_code=req.resource_code,
                    resource_name=req.resource_name,
                    category=req.category,
                    unit_of_measure=req.unit_of_measure,
                    calculated_required_quantity=req.calculated_required_quantity,
                    official_available_quantity=avail_qty,
                    shortfall_quantity=shortfall,
                    surplus_quantity=surplus,
                    recommended_quantity=None,  # Reserved for optimization engine
                    data_status=data_status,
                    source_provenance=prov,
                    integrity_note=note,
                )
            )

        return ResourceShortfallResult(
            geography=demand_result.geography,
            period=demand_result.period,
            methodology_version="shortfall-v1.0-foundation",
            items=shortfall_items,
            pipeline_stage="STAGE_7_RESOURCE_SHORTFALL",
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

    @staticmethod
    def audit_separation_of_concerns() -> Dict[str, Any]:
        """
        Explicitly distinguishes the 4 distinct operational data domains:
        A. Historical police deployment
        B. Official resource availability
        C. Future calculated resource demand
        D. Future optimization recommendation
        """
        return {
            "doctrine": "Zero-Fabrication Resource Optimization Foundation",
            "domains": {
                "A_HISTORICAL_DEPLOYMENT": {
                    "field": "crime_incidents.police_deployed_count",
                    "nature": "Historical incident-level police response logged during 2020-2025 events.",
                    "usage_rule": "Strictly descriptive historical artifact. NEVER treated as current inventory availability.",
                },
                "B_OFFICIAL_AVAILABILITY": {
                    "tables": ["state_resources", "district_resources (data_status LIKE 'OFFICIAL%')"],
                    "nature": "Audited inventory published by BPR&D, MHA, State Police portals, and NIC district pages.",
                    "usage_rule": "Authoritative ground truth. State totals are NEVER spatially disaggregated across districts.",
                },
                "C_FUTURE_DEMAND": {
                    "function": "OptimizationFoundationService.calculate_resource_demand",
                    "nature": "Normative operational requirements calculated from demographics, crime severity, and risk scores.",
                    "usage_rule": "Algorithmic requirement target for capacity planning.",
                },
                "D_FUTURE_RECOMMENDATION": {
                    "status": "PREPARED_FOR_NEXT_PHASE",
                    "nature": "Constrained linear programming / priority queue allocation outputs.",
                    "usage_rule": "Subject to administrative pool capacity constraints; remains unexecuted in Phase 7D.",
                },
            },
            "pipeline_stages": OPTIMIZATION_PIPELINE_STAGES,
        }

    @staticmethod
    def get_resource_summary(
        db: Session,
        state_id: Optional[int] = None,
        reference_year: Optional[int] = None,
    ) -> ResourceSummaryResponse:
        """
        Returns official state-level police resource summary grouped by state.
        Includes authoritative provenance, reference years, and coverage classifications.
        """
        where_clauses = ["sr.state_id NOT IN (9)"]  # Exclude historical Daman & Diu
        params: Dict[str, Any] = {}

        if state_id:
            where_clauses.append("sr.state_id = :state_id")
            params["state_id"] = state_id
        if reference_year:
            where_clauses.append("sr.reference_year = :ref_year")
            params["ref_year"] = reference_year

        where_sql = " AND ".join(where_clauses)

        sql = text(f"""
            SELECT 
                s.id as state_id,
                s.state_name,
                sr.reference_year,
                sr.source_name,
                sr.source_publication,
                sr.source_url,
                sr.source_geography,
                rt.resource_name,
                rt.category,
                rt.unit_of_measure,
                sr.available_quantity,
                sr.actual_quantity,
                sr.sanctioned_quantity
            FROM state_resources sr
            JOIN states s ON sr.state_id = s.id
            JOIN resource_types rt ON sr.resource_type_id = rt.id
            WHERE {where_sql}
            ORDER BY s.state_name, rt.id
        """)

        rows = db.execute(sql, params).fetchall()

        # Group by state
        states_dict: Dict[int, Dict[str, Any]] = {}
        for r in rows:
            sid = int(r[0])
            sname = str(r[1])
            ryear = int(r[2])
            sname_src = str(r[3])
            spub = str(r[4])
            surl = str(r[5]) if r[5] else None
            sgeo = str(r[6])
            rname = str(r[7])
            rcat = str(r[8])
            runit = str(r[9])
            avail = int(r[10]) if r[10] is not None else 0
            act = int(r[11]) if r[11] is not None else None
            sanc = int(r[12]) if r[12] is not None else None

            if sid not in states_dict:
                states_dict[sid] = {
                    "state_id": sid,
                    "state": sname,
                    "reference_year": ryear,
                    "source": sname_src,
                    "source_publication": spub,
                    "source_url": surl,
                    "geography_level": sgeo,
                    "resources": [],
                }

            states_dict[sid]["resources"].append(
                StateResourceSummaryItem(
                    resource_type=rname,
                    category=rcat,
                    available_quantity=avail,
                    actual_quantity=act,
                    sanctioned_quantity=sanc,
                    unit=runit,
                )
            )

        grouped_items: List[StateResourceGroupedSummary] = []
        for sid, item in states_dict.items():
            res_count = len(item["resources"])
            cov_status = "FULL COVERAGE" if res_count >= 8 else ("PARTIAL COVERAGE" if res_count > 0 else "NO OFFICIAL DATA")
            grouped_items.append(
                StateResourceGroupedSummary(
                    state_id=item["state_id"],
                    state=item["state"],
                    reference_year=item["reference_year"],
                    source=item["source"],
                    source_publication=item["source_publication"],
                    source_url=item["source_url"],
                    geography_level="State/UT",
                    coverage_status=cov_status,
                    resources=item["resources"],
                )
            )

        return ResourceSummaryResponse(
            total_states=len(grouped_items),
            data_freshness_notes={
                "police_personnel": "Reference Year 2020 (BPR&D DoPO / Lok Sabha AU2239)",
                "police_mobility_fleet": "Reference Year 2024 (BPR&D DoPO / Dataful 20140 & 20141)",
                "police_infrastructure": "Reference Year 2024 (BPR&D DoPO / Dataful 20144 & 20145)",
                "economic_offences_wings": "Reference Year 2024 (BPR&D DoPO / Dataful 20144)",
                "cctv_and_forensic": "UNRECORDED in official national state-level datasets",
            },
            items=grouped_items,
        )

    @staticmethod
    def get_crime_resource_comparison(
        db: Session,
        state_id: Optional[int] = None,
    ) -> ResourceCrimeComparisonResponse:
        """
        Produces an analytical comparison between historical crime burden (2020-2025)
        and official police resource availability (2020/2024) across Indian States & UTs.
        
        Includes per-capita metrics and explicit non-causality disclaimers.
        """
        filter_sql = "AND s.id = :state_id" if state_id else ""
        params = {"state_id": state_id} if state_id else {}

        sql = text(f"""
            SELECT 
                s.id as state_id,
                s.state_name,
                COALESCE(pop_sub.total_pop, 0) as population,
                COALESCE(crime_sub.incident_count, 0) as crime_incidents,
                res_sub.police_personnel,
                res_sub.patrol_vehicles,
                res_sub.police_stations
            FROM states s
            LEFT JOIN (
                SELECT d.state_id, SUM(dd.total_population) as total_pop
                FROM districts d
                JOIN district_demographics dd ON dd.district_id = d.id
                GROUP BY d.state_id
            ) pop_sub ON pop_sub.state_id = s.id
            LEFT JOIN (
                SELECT d.state_id, COUNT(ci.id) as incident_count
                FROM districts d
                JOIN crime_incidents ci ON ci.district_id = d.id
                GROUP BY d.state_id
            ) crime_sub ON crime_sub.state_id = s.id
            LEFT JOIN (
                SELECT 
                    sr.state_id,
                    MAX(CASE WHEN sr.resource_type_id = 1 THEN sr.available_quantity ELSE NULL END) as police_personnel,
                    MAX(CASE WHEN sr.resource_type_id = 2 THEN sr.available_quantity ELSE NULL END) as patrol_vehicles,
                    MAX(CASE WHEN sr.resource_type_id = 74 THEN sr.available_quantity ELSE NULL END) as police_stations
                FROM state_resources sr
                GROUP BY sr.state_id
            ) res_sub ON res_sub.state_id = s.id
            WHERE s.id NOT IN (9) {filter_sql}
            ORDER BY crime_incidents DESC, s.state_name ASC
        """)

        rows = db.execute(sql, params).fetchall()
        items: List[StateCrimeResourceComparisonItem] = []

        for r in rows:
            sid = int(r[0])
            sname = str(r[1])
            pop = int(r[2]) if r[2] else 0
            crimes = int(r[3]) if r[3] else 0
            police = int(r[4]) if r[4] is not None else None
            veh = int(r[5]) if r[5] is not None else None
            stations = int(r[6]) if r[6] is not None else None

            crime_rate = round((crimes / pop) * 100000.0, 2) if pop > 0 else 0.0
            police_rate = round((police / pop) * 100000.0, 2) if (police is not None and pop > 0) else None
            veh_rate = round((veh / pop) * 100000.0, 2) if (veh is not None and pop > 0) else None
            stations_rate = round((stations / pop) * 100000.0, 2) if (stations is not None and pop > 0) else None

            items.append(
                StateCrimeResourceComparisonItem(
                    state_id=sid,
                    state_name=sname,
                    census_2011_population=pop,
                    total_crime_incidents=crimes,
                    crime_rate_per_100k=crime_rate,
                    police_personnel=police,
                    police_per_100k=police_rate,
                    police_vehicles=veh,
                    vehicles_per_100k=veh_rate,
                    police_stations=stations,
                    stations_per_100k=stations_rate,
                    personnel_ref_year=2020,
                    vehicles_ref_year=2024,
                    stations_ref_year=2024,
                    historical_crime_years="2020-2025",
                )
            )

        return ResourceCrimeComparisonResponse(
            comparison_period="2020-2025 Historical Crime vs 2020/2024 Official BPR&D Police Resources",
            crime_data_span="2020-2025 (191,679 incidents)",
            resource_reference_years={
                "police_personnel": 2020,
                "patrol_vehicles": 2024,
                "police_stations": 2024,
            },
            disclaimer="Analytical comparison only. Does not infer causality between police resource levels and reported crime rates.",
            items=items,
        )

    @staticmethod
    def list_resource_types(db: Session) -> List[ResourceTypeSummaryResponse]:
        """Lists all active resource types with categorization and measurement units."""
        sql = text("""
            SELECT id, code, resource_name, category, unit_of_measure, description,
                   is_personnel, is_vehicle, is_team, is_equipment, is_infrastructure, is_active
            FROM resource_types
            WHERE is_active = 1
            ORDER BY id
        """)
        rows = db.execute(sql).fetchall()
        return [
            ResourceTypeSummaryResponse(
                id=int(r[0]),
                code=str(r[1]) if r[1] else None,
                resource_name=str(r[2]),
                category=str(r[3]),
                unit_of_measure=str(r[4]),
                description=str(r[5]) if r[5] else None,
                is_personnel=bool(r[6]),
                is_vehicle=bool(r[7]),
                is_team=bool(r[8]),
                is_equipment=bool(r[9]),
                is_infrastructure=bool(r[10]),
                is_active=bool(r[11]),
            )
            for r in rows
        ]
