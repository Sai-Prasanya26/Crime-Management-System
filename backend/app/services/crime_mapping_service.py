"""
Phase 10: Crime-to-Resource Mapping & Inventory Service.

Implements:
1. Configurable Crime-to-Resource Mapping Master for all 21 crime types.
2. Planning associations between predicted crime types and preventive resources (Personnel, Mobility, Investigation, Specialized, Traffic).
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
    CrimeResourceMappingItem,
    CrimeResourceMappingUpdateRequest,
    ResourceInventoryItem,
    ResourceInventoryUpdateRequest,
    ResourceInventorySummaryResponse,
)

logger = logging.getLogger(__name__)

# Default Institutional Planning Associations for all 21 Crime Types
DEFAULT_CRIME_MAPPINGS = [
    # 1. Extortion (ID: 1, Cat: 2 Other Crime, Severity: HIGH)
    {
        "crime_type_id": 1,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.30,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.25,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Covert physical surveillance, commercial corridor presence, and victim protection details.",
    },
    {
        "crime_type_id": 1,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.25,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.25,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Anti-extortion task forces investigating organized extortion rings and financial paper trails.",
    },
    {
        "crime_type_id": 1,
        "resource_type_id": 20,  # Cyber Police Personnel
        "coefficient": 0.20,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.20,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Digital communication interception and VoIP/messaging application tracing.",
    },
    # 2. Vandalism (ID: 2, Cat: 2 Other Crime, Severity: LOW)
    {
        "crime_type_id": 2,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.20,
        "min_demand_threshold": 0.08,
        "priority_weight": 0.80,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Foot patrols in commercial districts and transit facilities during late-night hours.",
    },
    {
        "crime_type_id": 2,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.10,
        "min_demand_threshold": 0.08,
        "priority_weight": 0.80,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Mobile patrol sweeps deterring public property defacement and facility intrusion.",
    },
    # 3. Shoplifting (ID: 3, Cat: 2 Other Crime, Severity: LOW)
    {
        "crime_type_id": 3,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.15,
        "min_demand_threshold": 0.10,
        "priority_weight": 0.75,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "High-visibility foot patrol in shopping corridors and commercial market complexes.",
    },
    # 4. Traffic Violation (ID: 4, Cat: 3 Traffic Fatality, Severity: LOW)
    {
        "crime_type_id": 4,
        "resource_type_id": 19,  # Traffic Police Personnel
        "coefficient": 0.60,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.00,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Dedicated traffic enforcement at known collision blackspots and speed monitoring checkpoints.",
    },
    {
        "crime_type_id": 4,
        "resource_type_id": 24,  # Highway Patrol Vehicles
        "coefficient": 0.35,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.00,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Highway patrol interceptors managing arterial traffic flow and immediate crash response.",
    },
    # 5. Firearm Offense (ID: 5, Cat: 1 Fire Accident, Severity: HIGH)
    {
        "crime_type_id": 5,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.50,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.30,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Armed quick-reaction patrols, cordon searches, and vehicle frisking at border sectors.",
    },
    {
        "crime_type_id": 5,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.25,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.30,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Tactical patrol vehicles with protective gear for armed engagement readiness.",
    },
    {
        "crime_type_id": 5,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.20,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.30,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Ballistic forensic tracing and illegal weapons trafficking network disruption.",
    },
    # 6. Sexual Assault (ID: 6, Cat: 4 Violent Crime, Severity: CRITICAL)
    {
        "crime_type_id": 6,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.60,
        "min_demand_threshold": 0.02,
        "priority_weight": 1.50,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Dedicated safety patrols in transit stations, isolated routes, and university clusters.",
    },
    {
        "crime_type_id": 6,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.25,
        "min_demand_threshold": 0.02,
        "priority_weight": 1.50,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "All-women safety mobile response units with rapid dispatch capability.",
    },
    {
        "crime_type_id": 6,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.30,
        "min_demand_threshold": 0.02,
        "priority_weight": 1.50,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Specialized sexual offense investigation units ensuring victim support and prompt forensic kit processing.",
    },
    # 7. Assault (ID: 7, Cat: 4 Violent Crime, Severity: HIGH)
    {
        "crime_type_id": 7,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.45,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.25,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Emergency response officers de-escalating violent disputes in public spaces.",
    },
    {
        "crime_type_id": 7,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.20,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.20,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Motorized dispatch units ensuring under-10-minute response to violent altercations.",
    },
    {
        "crime_type_id": 7,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.10,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.10,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Medico-legal documentation, crime scene witness interviewing, and evidentiary recording.",
    },
    # 8. Fraud (ID: 8, Cat: 2 Other Crime, Severity: MEDIUM)
    {
        "crime_type_id": 8,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.30,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.00,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Financial crime investigation officers handling forensic accounting and document audits.",
    },
    {
        "crime_type_id": 8,
        "resource_type_id": 20,  # Cyber Police Personnel
        "coefficient": 0.25,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.00,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Banking portal transaction tracking and fraudulent payment gateway lien enforcement.",
    },
    # 9. Cybercrime (ID: 9, Cat: 2 Other Crime, Severity: MEDIUM)
    {
        "crime_type_id": 9,
        "resource_type_id": 20,  # Cyber Police Personnel
        "coefficient": 0.60,
        "min_demand_threshold": 0.03,
        "priority_weight": 1.10,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Technical analysts monitoring digital fraud operations, phishing campaigns, and mule accounts.",
    },
    {
        "crime_type_id": 9,
        "resource_type_id": 52,  # Cyber Crime Units
        "coefficient": 0.35,
        "min_demand_threshold": 0.03,
        "priority_weight": 1.10,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Digital forensics teams handling server analysis, device imaging, and transaction freezing.",
    },
    # 10. Homicide (ID: 10, Cat: 2 Other Crime, Severity: CRITICAL)
    {
        "crime_type_id": 10,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.70,
        "min_demand_threshold": 0.01,
        "priority_weight": 1.50,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Area cordons and preventive deployment in high-tension factional or gang corridors.",
    },
    {
        "crime_type_id": 10,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.30,
        "min_demand_threshold": 0.01,
        "priority_weight": 1.50,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Perimeter containment and rapid deployment transport for tactical reserve units.",
    },
    {
        "crime_type_id": 10,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.40,
        "min_demand_threshold": 0.01,
        "priority_weight": 1.50,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Homicide investigation detectives with specialized forensic science laboratory support.",
    },
    # 11. Counterfeiting (ID: 11, Cat: 2 Other Crime, Severity: MEDIUM)
    {
        "crime_type_id": 11,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.35,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.00,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Counterfeit currency interdiction, printing press detection, and distribution network raids.",
    },
    # 12. Arson (ID: 12, Cat: 1 Fire Accident, Severity: CRITICAL)
    {
        "crime_type_id": 12,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.40,
        "min_demand_threshold": 0.02,
        "priority_weight": 1.40,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Crowd control, evacuation cordon enforcement, and critical asset protection during fire incidents.",
    },
    {
        "crime_type_id": 12,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.20,
        "min_demand_threshold": 0.02,
        "priority_weight": 1.30,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Emergency response transport coordinating with municipal fire service departments.",
    },
    {
        "crime_type_id": 12,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.25,
        "min_demand_threshold": 0.02,
        "priority_weight": 1.40,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Arson investigation teams with chemical residue and accelerant forensic analysis kits.",
    },
    # 13. Kidnapping (ID: 13, Cat: 2 Other Crime, Severity: CRITICAL)
    {
        "crime_type_id": 13,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.65,
        "min_demand_threshold": 0.01,
        "priority_weight": 1.50,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Immediate perimeter roadblocks, highway toll checking, and border sealing operations.",
    },
    {
        "crime_type_id": 13,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.35,
        "min_demand_threshold": 0.01,
        "priority_weight": 1.50,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "High-speed pursuit vehicles and mobile electronic surveillance vans.",
    },
    {
        "crime_type_id": 13,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.35,
        "min_demand_threshold": 0.01,
        "priority_weight": 1.50,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Anti-kidnapping technical squads with cellular triangulation and hostage negotiation units.",
    },
    # 14. Vehicle - Stolen (ID: 14, Cat: 4 Violent Crime, Severity: MEDIUM)
    {
        "crime_type_id": 14,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.35,
        "min_demand_threshold": 0.06,
        "priority_weight": 1.00,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "City entry/exit checking posts and parking zone verification patrols.",
    },
    {
        "crime_type_id": 14,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.30,
        "min_demand_threshold": 0.06,
        "priority_weight": 1.10,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "ANPR-equipped patrol cars scanning traffic streams for flagged stolen vehicle plates.",
    },
    {
        "crime_type_id": 14,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.10,
        "min_demand_threshold": 0.06,
        "priority_weight": 1.00,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Specialized auto-theft squads raiding illegal dismantling garages and forged title rings.",
    },
    # 15. Burglary (ID: 15, Cat: 2 Other Crime, Severity: MEDIUM)
    {
        "crime_type_id": 15,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.40,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.00,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Residential night patrols and beat constabulary presence in quiet suburban neighborhoods.",
    },
    {
        "crime_type_id": 15,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.20,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.00,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Roving sector patrol vehicles providing deterrence and quick response to burglary alarms.",
    },
    {
        "crime_type_id": 15,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.10,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.00,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Crime scene fingerprint lifting, tool-mark analysis, and pawn shop stolen property tracking.",
    },
    # 16. Domestic Violence (ID: 16, Cat: 4 Violent Crime, Severity: HIGH)
    {
        "crime_type_id": 16,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.40,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.25,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Trained dispute resolution officers and specialized Women Police Desk personnel.",
    },
    {
        "crime_type_id": 16,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.20,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.20,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Rapid response patrol cars dispatched immediately to domestic emergency SOS calls.",
    },
    # 17. Drug Offense (ID: 17, Cat: 2 Other Crime, Severity: MEDIUM)
    {
        "crime_type_id": 17,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.40,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.10,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Patrol operations near academic institutions, transit hubs, and nightlife clusters.",
    },
    {
        "crime_type_id": 17,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.20,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.10,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Highway and state-border interdiction vehicles inspecting suspected contraband transports.",
    },
    {
        "crime_type_id": 17,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.25,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.15,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Anti-narcotics task force tracking wholesale supply syndicates and precursor chemicals.",
    },
    # 18. Identity Theft (ID: 18, Cat: 4 Violent Crime, Severity: MEDIUM)
    {
        "crime_type_id": 18,
        "resource_type_id": 20,  # Cyber Police Personnel
        "coefficient": 0.40,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.00,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Cyber analysts auditing compromised databases, SIM-swap rings, and forged credential portals.",
    },
    {
        "crime_type_id": 18,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.20,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.00,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Evidence collection on identity spoofing, unauthorized loans, and credit bureau fraud.",
    },
    # 19. Robbery (ID: 19, Cat: 4 Violent Crime, Severity: HIGH)
    {
        "crime_type_id": 19,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.50,
        "min_demand_threshold": 0.03,
        "priority_weight": 1.25,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "High-visibility patrols in banking zones, jewelry markets, and vulnerable arterial routes.",
    },
    {
        "crime_type_id": 19,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.25,
        "min_demand_threshold": 0.03,
        "priority_weight": 1.25,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Armed patrol vehicles on roving surveillance to intercept violent highway and street robberies.",
    },
    {
        "crime_type_id": 19,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.15,
        "min_demand_threshold": 0.03,
        "priority_weight": 1.20,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Robbery investigation units checking habitual offenders, surveillance CCTV, and fence networks.",
    },
    # 20. Illegal Possession (ID: 20, Cat: 2 Other Crime, Severity: MEDIUM)
    {
        "crime_type_id": 20,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.30,
        "min_demand_threshold": 0.06,
        "priority_weight": 0.90,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Station-level beat checks and cordon-and-search ops for contraband weapons and stolen assets.",
    },
    {
        "crime_type_id": 20,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.15,
        "min_demand_threshold": 0.06,
        "priority_weight": 0.90,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Mobile patrol stop-and-search operations at key checkpoints.",
    },
    # 21. Public Intoxication (ID: 21, Cat: 2 Other Crime, Severity: LOW)
    {
        "crime_type_id": 21,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.20,
        "min_demand_threshold": 0.10,
        "priority_weight": 0.70,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Foot patrols around entertainment strips, wine shops, and public gathering points.",
    },
    {
        "crime_type_id": 21,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.10,
        "min_demand_threshold": 0.10,
        "priority_weight": 0.70,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Transport support for detained disorderly individuals to medical checkups and police stations.",
    },
]


class CrimeMappingService:
    @staticmethod
    def seed_default_mappings(db: Session) -> int:
        """Seeds institutional crime-to-resource mappings for all 21 crime types if not already seeded."""
        existing_count = db.query(CrimeResourceMapping).count()
        if existing_count > 0:
            return existing_count

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
        logger.info(f"Seeded {created} crime-to-resource mappings.")
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
        for m, ccode, cname, cat_id, sev, cat_name, rname in rows:
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
    # Inventory Management Logic
    # =========================================================================

    @staticmethod
    def seed_default_inventory(db: Session) -> int:
        """Seeds state-level inventory records from verified BPR&D state_resources if not already seeded."""
        existing_count = db.query(ResourceInventoryRecord).count()
        if existing_count > 0:
            return existing_count

        active_states = db.query(State).filter(State.is_active == True).all()
        created = 0

        for s in active_states:
            # 1. Personnel (resource_type_id = 1)
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

            # 2. Mobility (resource_type_id = 2)
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

            # 3. Investigation Teams (resource_type_id = 3)
            # Baseline: ~1 team per 50 personnel
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

            # 4. Specialized Teams - Cyber Specialists (resource_type_id = 20)
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
            created += 4

        db.commit()
        logger.info(f"Seeded {created} resource inventory records across {len(active_states)} active states.")
        return created

    @staticmethod
    def list_inventory(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        category: Optional[str] = None,
    ) -> List[ResourceInventoryItem]:
        """Lists resource inventory records with explicit availability breakdown."""
        CrimeMappingService.seed_default_inventory(db)

        query = (
            db.query(
                ResourceInventoryRecord,
                State.state_name,
                District.district_name,
                ResourceType.resource_name,
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
        for inv, sname, dname, rname in rows:
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
                    total_inventory=inv.total_inventory,
                    deployed_count=inv.deployed_count,
                    unavailable_count=inv.unavailable_count,
                    available_pool=inv.available_pool,
                    data_status=inv.data_status,
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
        """Computes aggregated inventory totals, deployed counts, and available pools by category."""
        items = CrimeMappingService.list_inventory(db, state_id=state_id)

        cat_totals: Dict[str, int] = {"PERSONNEL": 0, "MOBILITY": 0, "INVESTIGATION": 0, "SPECIALIZED": 0}
        cat_deployed: Dict[str, int] = {"PERSONNEL": 0, "MOBILITY": 0, "INVESTIGATION": 0, "SPECIALIZED": 0}
        cat_unavail: Dict[str, int] = {"PERSONNEL": 0, "MOBILITY": 0, "INVESTIGATION": 0, "SPECIALIZED": 0}
        cat_avail: Dict[str, int] = {"PERSONNEL": 0, "MOBILITY": 0, "INVESTIGATION": 0, "SPECIALIZED": 0}

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

        categories_breakdown = [
            {
                "category": cat,
                "total": cat_totals[cat],
                "deployed": cat_deployed[cat],
                "unavailable": cat_unavail[cat],
                "available": cat_avail[cat],
                "utilization_rate_pct": round((cat_deployed[cat] / max(cat_totals[cat], 1)) * 100.0, 1),
            }
            for cat in sorted(cat_totals.keys())
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
            disclaimer="Available pools represent estimated uncommitted mobile resources for scenario optimization, not statutory redeployment mandates.",
        )
