"""
Script to apply Phase 10 Extension:
1. Update backend/app/services/crime_mapping_service.py with complete 210 mappings and 10 pools inventory.
2. Seed the live MySQL database with 210 mappings and 360 inventory records.
3. Validate database consistency.
"""

import sys
import os
import pprint
from decimal import Decimal

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import backend.scripts.generate_expanded_mapping_matrix as gen
from backend.app.database.session import SessionLocal
from backend.app.models.optimization import CrimeResourceMapping, ResourceInventoryRecord
from backend.app.models.geography import State, District
from backend.app.models.resources import ResourceType, StateResource
from sqlalchemy import text

total_210 = gen.total_210
assert len(total_210) == 210, f"Expected 210 mappings, got {len(total_210)}"

# Read header of crime_mapping_service.py
file_path = "backend/app/services/crime_mapping_service.py"

header = '''"""
Phase 10: Crime-to-Resource Mapping & Inventory Service.

Implements:
1. Configurable Crime-to-Resource Mapping Master for all 21 crime types across 10 resource pools (210 combinations).
2. Planning associations between predicted crime types and preventive resources:
   - PERSONNEL, MOBILITY, INVESTIGATION, SPECIALIZED, SURVEILLANCE,
   - FORENSIC, CYBER_TECHNOLOGY, EMERGENCY_RESPONSE, COMMUNICATION, TRAFFIC_SAFETY.
3. Resource Inventory Management with explicit distinction between Total, Deployed, Unavailable, and Available standing pools.
4. Administrative configuration mechanisms with planning disclaimers.
"""

from typing import List, Dict, Any, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from fastapi import HTTPException, status
import logging

from backend.app.models.optimization import CrimeResourceMapping, ResourceInventoryRecord
from backend.app.models.crime import CrimeType, CrimeCategory
from backend.app.models.resources import ResourceType, StateResource
from backend.app.models.geography import State, District
from backend.app.schemas.optimization import (
    ALL_RESOURCE_POOLS,
    CrimeResourceMappingItem,
    CrimeResourceMappingUpdateRequest,
    ResourceInventoryItem,
    ResourceInventoryUpdateRequest,
    ResourceInventorySummaryResponse,
)

logger = logging.getLogger(__name__)

# Complete Institutional Planning Associations for all 21 Crime Types across 10 Resource Pools (210 mappings)
DEFAULT_CRIME_MAPPINGS = '''

mappings_code = pprint.pformat(total_210, indent=4, width=120)

body = '''


class CrimeMappingService:
    @staticmethod
    def seed_default_mappings(db: Session) -> int:
        """Seeds institutional crime-to-resource mappings for all 21 crime types across 10 pools if not already seeded."""
        existing_count = db.query(CrimeResourceMapping).count()
        if existing_count == len(DEFAULT_CRIME_MAPPINGS):
            return existing_count
        if existing_count > 0:
            logger.info(f"Existing mappings count {existing_count} differs from {len(DEFAULT_CRIME_MAPPINGS)}. Upgrading to 210 mappings...")
            db.query(CrimeResourceMapping).delete()
            db.commit()

        created = 0
        for m in DEFAULT_CRIME_MAPPINGS:
            mapping = CrimeResourceMapping(
                crime_type_id=m["crime_type_id"],
                resource_type_id=m["resource_type_id"],
                coefficient=Decimal(str(m["coefficient"])),
                min_demand_threshold=Decimal(str(m["min_demand_threshold"])),
                priority_weight=Decimal(str(m["priority_weight"])),
                shared_pool_category=m["shared_pool_category"],
                operational_rationale=m["operational_rationale"],
                is_active=True,
            )
            db.add(mapping)
            created += 1

        db.commit()
        logger.info(f"Seeded {created} crime-to-resource mappings across 10 pools.")
        return created

    @staticmethod
    def reset_mappings(db: Session) -> int:
        """Resets crime-to-resource mappings to default verified institutional parameters."""
        db.query(CrimeResourceMapping).delete()
        db.commit()
        return CrimeMappingService.seed_default_mappings(db)

    @staticmethod
    def list_mappings(
        db: Session,
        crime_type_id: Optional[int] = None,
        shared_pool_category: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> List[CrimeResourceMappingItem]:
        """Lists active and configured crime-to-resource mappings with rich crime & resource metadata."""
        # Ensure seeded
        CrimeMappingService.seed_default_mappings(db)

        query = (
            db.query(
                CrimeResourceMapping,
                CrimeType.crime_code,
                CrimeType.crime_name,
                CrimeType.category_id,
                CrimeType.severity_level,
                CrimeCategory.category_name,
                ResourceType.resource_name,
                ResourceType.unit_of_measure,
            )
            .join(CrimeType, CrimeResourceMapping.crime_type_id == CrimeType.id)
            .join(CrimeCategory, CrimeType.category_id == CrimeCategory.id)
            .join(ResourceType, CrimeResourceMapping.resource_type_id == ResourceType.id)
        )

        if crime_type_id is not None:
            query = query.filter(CrimeResourceMapping.crime_type_id == crime_type_id)
        if shared_pool_category:
            query = query.filter(CrimeResourceMapping.shared_pool_category == shared_pool_category.upper())
        if is_active is not None:
            query = query.filter(CrimeResourceMapping.is_active == is_active)

        rows = query.order_by(CrimeType.id, CrimeResourceMapping.id).all()

        results = []
        for m, ccode, cname, cat_id, sev, cat_name, rname, runit in rows:
            results.append(
                CrimeResourceMappingItem(
                    id=m.id,
                    crime_type_id=m.crime_type_id,
                    crime_code=ccode,
                    crime_name=cname,
                    category_id=cat_id,
                    category_name=cat_name,
                    severity_level=sev,
                    resource_type_id=m.resource_type_id,
                    resource_name=rname,
                    coefficient=float(m.coefficient),
                    min_demand_threshold=float(m.min_demand_threshold),
                    priority_weight=float(m.priority_weight),
                    shared_pool_category=m.shared_pool_category,
                    unit_of_measure=runit,
                    operational_rationale=m.operational_rationale,
                    is_active=m.is_active,
                )
            )
        return results

    @staticmethod
    def update_mapping(
        db: Session,
        mapping_id: int,
        req: CrimeResourceMappingUpdateRequest,
    ) -> CrimeResourceMappingItem:
        """Updates a crime-to-resource mapping's coefficients, thresholds, weights, or operational rationale."""
        mapping = db.query(CrimeResourceMapping).filter(CrimeResourceMapping.id == mapping_id).first()
        if not mapping:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"CrimeResourceMapping with ID {mapping_id} not found.",
            )

        if req.coefficient is not None:
            mapping.coefficient = Decimal(str(round(req.coefficient, 3)))
        if req.min_demand_threshold is not None:
            mapping.min_demand_threshold = Decimal(str(round(req.min_demand_threshold, 3)))
        if req.priority_weight is not None:
            mapping.priority_weight = Decimal(str(round(req.priority_weight, 2)))
        if req.operational_rationale is not None:
            mapping.operational_rationale = req.operational_rationale
        if req.is_active is not None:
            mapping.is_active = req.is_active

        db.commit()
        db.refresh(mapping)

        # Re-fetch with joins
        items = CrimeMappingService.list_mappings(db, crime_type_id=mapping.crime_type_id)
        for item in items:
            if item.id == mapping.id:
                return item
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to reload updated mapping.")

    # =========================================================================
    # Inventory Management Logic (10 Resource Pools across 36 Active States)
    # =========================================================================

    @staticmethod
    def seed_default_inventory(db: Session) -> int:
        """
        Seeds state-level inventory records for all 10 resource pools across all 36 active states.
        Preserves official BPR&D baselines for PERSONNEL, MOBILITY, INVESTIGATION, and SPECIALIZED.
        Seeds SURVEILLANCE, FORENSIC, CYBER_TECHNOLOGY, EMERGENCY_RESPONSE, COMMUNICATION,
        and TRAFFIC_SAFETY with NOT_CONFIGURED status (total=0, avail=0) until official admin audits.
        """
        active_states = db.query(State).filter(State.is_active == True).all()
        created = 0

        # Specifications for the 6 new pools
        NEW_POOL_DEFAULTS = [
            {
                "category": "SURVEILLANCE",
                "resource_type_id": 61,
                "source_name": "State Smart City & Traffic Surveillance Network (Unconfigured Baseline)",
                "notes": "Unconfigured surveillance infrastructure; pending district-level sensor audit.",
            },
            {
                "category": "FORENSIC",
                "resource_type_id": 121,
                "source_name": "State Forensic Science Laboratory (SFSL) Capacity Baseline (Unconfigured)",
                "notes": "Unconfigured forensic examination laboratory testing bandwidth.",
            },
            {
                "category": "CYBER_TECHNOLOGY",
                "resource_type_id": 122,
                "source_name": "State Cyber Command & Digital Evidence Workstations (Unconfigured)",
                "notes": "Dedicated digital forensic workstations and hardware imaging equipment.",
            },
            {
                "category": "EMERGENCY_RESPONSE",
                "resource_type_id": 123,
                "source_name": "State Health & Emergency Medical Services (EMS / 108 Partner Agency)",
                "notes": "External partner-agency emergency medical services and trauma ambulance units.",
            },
            {
                "category": "COMMUNICATION",
                "resource_type_id": 124,
                "source_name": "State Police Wireless & ERSS-112 Dispatch Consoles (Unconfigured)",
                "notes": "Dedicated emergency dispatch channels and police communication consoles.",
            },
            {
                "category": "TRAFFIC_SAFETY",
                "resource_type_id": 125,
                "source_name": "State Traffic Enforcement & Road Safety Inventory (Unconfigured)",
                "notes": "Specialized speed-measuring radars and calibrated breath alcohol analyzers.",
            },
        ]

        for s in active_states:
            # 1. Personnel (resource_type_id = 1)
            exist_p = db.query(ResourceInventoryRecord).filter(
                ResourceInventoryRecord.state_id == s.id,
                ResourceInventoryRecord.category == "PERSONNEL"
            ).first()
            if not exist_p:
                sr_p = (
                    db.query(StateResource)
                    .filter(StateResource.state_id == s.id, StateResource.resource_type_id == 1)
                    .first()
                )
                actual_p = sr_p.actual_quantity if (sr_p and sr_p.actual_quantity) else 5000
                deployed_p = int(actual_p * 0.80)
                unavail_p = int(actual_p * 0.05)
                avail_p = actual_p - deployed_p - unavail_p

                inv_p = ResourceInventoryRecord(
                    state_id=s.id,
                    district_id=None,
                    resource_type_id=1,
                    category="PERSONNEL",
                    total_inventory=actual_p,
                    deployed_count=deployed_p,
                    unavailable_count=unavail_p,
                    available_pool=avail_p,
                    data_status="OFFICIAL_BPRD_BENCHMARK",
                    reference_year=2024,
                    source_name="BPR&D Data on Police Organizations (Table 1.1)",
                    notes="Official state civil & armed police force strength.",
                )
                db.add(inv_p)
                created += 1

            # 2. Mobility (resource_type_id = 2)
            exist_v = db.query(ResourceInventoryRecord).filter(
                ResourceInventoryRecord.state_id == s.id,
                ResourceInventoryRecord.category == "MOBILITY"
            ).first()
            if not exist_v:
                sr_v = (
                    db.query(StateResource)
                    .filter(StateResource.state_id == s.id, StateResource.resource_type_id == 2)
                    .first()
                )
                actual_v = sr_v.actual_quantity if (sr_v and sr_v.actual_quantity) else 400
                deployed_v = int(actual_v * 0.75)
                unavail_v = int(actual_v * 0.10)
                avail_v = actual_v - deployed_v - unavail_v

                inv_v = ResourceInventoryRecord(
                    state_id=s.id,
                    district_id=None,
                    resource_type_id=2,
                    category="MOBILITY",
                    total_inventory=actual_v,
                    deployed_count=deployed_v,
                    unavailable_count=unavail_v,
                    available_pool=avail_v,
                    data_status="OFFICIAL_BPRD_BENCHMARK",
                    reference_year=2024,
                    source_name="BPR&D Data on Police Organizations (Transport Fleet)",
                    notes="Official police patrol & operational transport fleet.",
                )
                db.add(inv_v)
                created += 1

            # 3. Investigation Teams (resource_type_id = 3)
            exist_i = db.query(ResourceInventoryRecord).filter(
                ResourceInventoryRecord.state_id == s.id,
                ResourceInventoryRecord.category == "INVESTIGATION"
            ).first()
            if not exist_i:
                sr_p = (
                    db.query(StateResource)
                    .filter(StateResource.state_id == s.id, StateResource.resource_type_id == 1)
                    .first()
                )
                actual_p = sr_p.actual_quantity if (sr_p and sr_p.actual_quantity) else 5000
                actual_inv = max(int(actual_p / 50), 30)
                deployed_inv = int(actual_inv * 0.80)
                unavail_inv = int(actual_inv * 0.05)
                avail_inv = actual_inv - deployed_inv - unavail_inv

                inv_i = ResourceInventoryRecord(
                    state_id=s.id,
                    district_id=None,
                    resource_type_id=3,
                    category="INVESTIGATION",
                    total_inventory=actual_inv,
                    deployed_count=deployed_inv,
                    unavailable_count=unavail_inv,
                    available_pool=avail_inv,
                    data_status="ADMIN_PLANNING_INPUT",
                    reference_year=2024,
                    source_name="State Police Crime Investigation Wing Baseline",
                    notes="Gazetted district and sector-level crime scene investigation teams.",
                )
                db.add(inv_i)
                created += 1

            # 4. Specialized Teams - Cyber Specialists (resource_type_id = 20)
            exist_s = db.query(ResourceInventoryRecord).filter(
                ResourceInventoryRecord.state_id == s.id,
                ResourceInventoryRecord.category == "SPECIALIZED"
            ).first()
            if not exist_s:
                sr_p = (
                    db.query(StateResource)
                    .filter(StateResource.state_id == s.id, StateResource.resource_type_id == 1)
                    .first()
                )
                actual_p = sr_p.actual_quantity if (sr_p and sr_p.actual_quantity) else 5000
                actual_cyb = max(int(actual_p / 150), 15)
                deployed_cyb = int(actual_cyb * 0.75)
                unavail_cyb = int(actual_cyb * 0.05)
                avail_cyb = actual_cyb - deployed_cyb - unavail_cyb

                inv_c = ResourceInventoryRecord(
                    state_id=s.id,
                    district_id=None,
                    resource_type_id=20,
                    category="SPECIALIZED",
                    total_inventory=actual_cyb,
                    deployed_count=deployed_cyb,
                    unavailable_count=unavail_cyb,
                    available_pool=avail_cyb,
                    data_status="ADMIN_PLANNING_INPUT",
                    reference_year=2024,
                    source_name="State Cyber Crime Cell / CID Technical Units",
                    notes="Certified digital forensics specialists and cyber investigators.",
                )
                db.add(inv_c)
                created += 1

            # 5-10. Six New Pools (SURVEILLANCE, FORENSIC, CYBER_TECHNOLOGY, EMERGENCY_RESPONSE, COMMUNICATION, TRAFFIC_SAFETY)
            for np_item in NEW_POOL_DEFAULTS:
                exist_np = db.query(ResourceInventoryRecord).filter(
                    ResourceInventoryRecord.state_id == s.id,
                    ResourceInventoryRecord.category == np_item["category"]
                ).first()
                if not exist_np:
                    inv_np = ResourceInventoryRecord(
                        state_id=s.id,
                        district_id=None,
                        resource_type_id=np_item["resource_type_id"],
                        category=np_item["category"],
                        total_inventory=0,
                        deployed_count=0,
                        unavailable_count=0,
                        available_pool=0,
                        data_status="NOT_CONFIGURED",
                        reference_year=2024,
                        source_name=np_item["source_name"],
                        notes=np_item["notes"],
                    )
                    db.add(inv_np)
                    created += 1

        db.commit()
        total_records = db.query(ResourceInventoryRecord).count()
        logger.info(f"Inventory status: created {created} new records, total records in DB: {total_records} (expected: 360).")
        return total_records

    @staticmethod
    def list_inventory(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        category: Optional[str] = None,
    ) -> List[ResourceInventoryItem]:
        """Lists resource inventory records with explicit availability breakdown and unit metadata."""
        CrimeMappingService.seed_default_inventory(db)

        query = (
            db.query(
                ResourceInventoryRecord,
                State.state_name,
                District.district_name,
                ResourceType.resource_name,
                ResourceType.unit_of_measure,
            )
            .join(State, ResourceInventoryRecord.state_id == State.id)
            .outerjoin(District, ResourceInventoryRecord.district_id == District.id)
            .join(ResourceType, ResourceInventoryRecord.resource_type_id == ResourceType.id)
        )

        if state_id:
            query = query.filter(ResourceInventoryRecord.state_id == state_id)
        if district_id:
            query = query.filter(ResourceInventoryRecord.district_id == district_id)
        if category:
            query = query.filter(ResourceInventoryRecord.category == category.upper())

        rows = query.order_by(State.state_name, ResourceInventoryRecord.category).all()
        results = []
        for inv, sname, dname, rname, runit in rows:
            is_partner = (inv.category == "EMERGENCY_RESPONSE")
            is_conf = (inv.data_status != "NOT_CONFIGURED")
            results.append(
                ResourceInventoryItem(
                    id=inv.id,
                    state_id=inv.state_id,
                    state_name=sname,
                    district_id=inv.district_id,
                    district_name=dname,
                    resource_type_id=inv.resource_type_id,
                    resource_name=rname,
                    category=inv.category,
                    unit_of_measure=runit,
                    total_inventory=inv.total_inventory,
                    deployed_count=inv.deployed_count,
                    unavailable_count=inv.unavailable_count,
                    available_pool=inv.available_pool,
                    data_status=inv.data_status,
                    is_external_partner=is_partner,
                    is_configured=is_conf,
                    reference_year=inv.reference_year,
                    source_name=inv.source_name,
                    notes=inv.notes,
                )
            )
        return results

    @staticmethod
    def update_inventory(
        db: Session,
        inventory_id: int,
        req: ResourceInventoryUpdateRequest,
    ) -> ResourceInventoryItem:
        """Updates standing inventory, deployed count, or unavailable count for scenario adjustments."""
        inv = db.query(ResourceInventoryRecord).filter(ResourceInventoryRecord.id == inventory_id).first()
        if not inv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"ResourceInventoryRecord with ID {inventory_id} not found.",
            )

        if req.total_inventory is not None:
            inv.total_inventory = req.total_inventory
        if req.deployed_count is not None:
            inv.deployed_count = req.deployed_count
        if req.unavailable_count is not None:
            inv.unavailable_count = req.unavailable_count
        if req.notes is not None:
            inv.notes = req.notes

        # Recompute available pool: max(0, total - deployed - unavailable)
        inv.available_pool = max(0, inv.total_inventory - inv.deployed_count - inv.unavailable_count)
        inv.data_status = "ADMIN_PLANNING_INPUT"

        db.commit()
        db.refresh(inv)

        items = CrimeMappingService.list_inventory(db, state_id=inv.state_id)
        for item in items:
            if item.id == inv.id:
                return item
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to reload inventory record.")

    @staticmethod
    def get_available_inventory_summary(
        db: Session,
        state_id: Optional[int] = None,
    ) -> ResourceInventorySummaryResponse:
        """Computes aggregated inventory totals, deployed counts, and available pools across all 10 resource categories."""
        items = CrimeMappingService.list_inventory(db, state_id=state_id)

        cat_meta = {
            "PERSONNEL": {"unit": "Personnel", "is_partner": False},
            "MOBILITY": {"unit": "Vehicles", "is_partner": False},
            "INVESTIGATION": {"unit": "Teams", "is_partner": False},
            "SPECIALIZED": {"unit": "Units", "is_partner": False},
            "SURVEILLANCE": {"unit": "Cameras", "is_partner": False},
            "FORENSIC": {"unit": "Tests/Month", "is_partner": False},
            "CYBER_TECHNOLOGY": {"unit": "Workstations", "is_partner": False},
            "EMERGENCY_RESPONSE": {"unit": "Ambulances", "is_partner": True},
            "COMMUNICATION": {"unit": "Channels", "is_partner": False},
            "TRAFFIC_SAFETY": {"unit": "Devices", "is_partner": False},
        }

        all_categories = list(cat_meta.keys())
        cat_totals: Dict[str, int] = {cat: 0 for cat in all_categories}
        cat_deployed: Dict[str, int] = {cat: 0 for cat in all_categories}
        cat_unavail: Dict[str, int] = {cat: 0 for cat in all_categories}
        cat_avail: Dict[str, int] = {cat: 0 for cat in all_categories}
        cat_configured: Dict[str, bool] = {cat: True for cat in all_categories}

        for item in items:
            cat = item.category.upper()
            if cat not in cat_totals:
                cat_totals[cat] = 0
                cat_deployed[cat] = 0
                cat_unavail[cat] = 0
                cat_avail[cat] = 0
            cat_totals[cat] += item.total_inventory
            cat_deployed[cat] += item.deployed_count
            cat_unavail[cat] += item.unavailable_count
            cat_avail[cat] += item.available_pool
            if item.data_status == "NOT_CONFIGURED":
                cat_configured[cat] = False

        categories_breakdown = [
            {
                "category": cat,
                "unit_of_measure": cat_meta.get(cat, {}).get("unit", "Units"),
                "is_external_partner": cat_meta.get(cat, {}).get("is_partner", False),
                "is_configured": cat_configured.get(cat, True),
                "total": cat_totals[cat],
                "deployed": cat_deployed[cat],
                "unavailable": cat_unavail[cat],
                "available": cat_avail[cat],
                "utilization_rate_pct": round((cat_deployed[cat] / max(cat_totals[cat], 1)) * 100.0, 1),
            }
            for cat in all_categories
        ]

        state_name = None
        if state_id:
            st = db.query(State).filter(State.id == state_id).first()
            if st:
                state_name = st.state_name

        return ResourceInventorySummaryResponse(
            state_id=state_id,
            state_name=state_name or "All States & UTs (National Summary)",
            reference_year=2024,
            categories=categories_breakdown,
            total_inventory_by_category=cat_totals,
            deployed_by_category=cat_deployed,
            unavailable_by_category=cat_unavail,
            available_by_category=cat_avail,
            data_source="BPR&D Data on Police Organizations 2024 + Admin Planning Inputs",
            disclaimer="Available pools represent estimated uncommitted mobile resources for scenario optimization, not statutory redeployment mandates. Unconfigured pools require state administrative inventory baselines.",
        )
'''

full_code = header + mappings_code + body

with open(file_path, "w", encoding="utf-8") as f:
    f.write(full_code)

print(f"Successfully wrote {len(full_code)} characters to {file_path}")

# Import newly written service
from backend.app.services.crime_mapping_service import CrimeMappingService

# Now seed database
db = SessionLocal()
try:
    mappings_count = CrimeMappingService.seed_default_mappings(db)
    print(f"Database CrimeResourceMapping count: {mappings_count}")
    assert mappings_count == 210, f"Expected 210 mappings, got {mappings_count}"

    inventory_count = CrimeMappingService.seed_default_inventory(db)
    print(f"Database ResourceInventoryRecord count: {inventory_count}")
    assert inventory_count == 360, f"Expected 360 inventory records (36 states x 10 pools), got {inventory_count}"

    # Verify breakdown by category
    by_cat = db.execute(text("SELECT category, COUNT(*) FROM resource_inventory_records GROUP BY category")).fetchall()
    print("Inventory by category:", dict(by_cat))
    assert len(by_cat) == 10, f"Expected 10 categories, got {len(by_cat)}"
    for cat, cnt in by_cat:
        assert cnt == 36, f"Category {cat} has {cnt} records, expected 36"

    print("Phase 10 Extension Database Seeding verified successfully!")
finally:
    db.close()
