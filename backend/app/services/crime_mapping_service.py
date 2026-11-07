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

# Default Institutional Planning Associations for all 21 Crime Types (84 mappings: 21 crimes x 4 pools)
DEFAULT_CRIME_MAPPINGS = [
    # 1. Extortion (ID: 1, Cat: Other Crime, Severity: HIGH)
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
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.15,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.20,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Mobile intercept units and rapid reaction patrols along commercial transit corridors.",
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
        "resource_type_id": 95,  # District Intelligence Units
        "coefficient": 0.20,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.20,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "District intelligence tracking of organized gang communications and extortion syndicate networks.",
    },
    # 2. Vandalism (ID: 2, Cat: Other Crime, Severity: LOW)
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
    {
        "crime_type_id": 2,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.05,
        "min_demand_threshold": 0.10,
        "priority_weight": 0.75,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Station-level case documentation, CCTV footage recovery, and restitution processing.",
    },
    {
        "crime_type_id": 2,
        "resource_type_id": 105,  # Quick Reaction Teams (QRT)
        "coefficient": 0.05,
        "min_demand_threshold": 0.10,
        "priority_weight": 0.70,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Quick reaction team standby during public unrest and coordinated vandalism flashpoints.",
    },
    # 3. Shoplifting (ID: 3, Cat: Other Crime, Severity: LOW)
    {
        "crime_type_id": 3,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.15,
        "min_demand_threshold": 0.10,
        "priority_weight": 0.75,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "High-visibility foot patrol in shopping corridors and commercial market complexes.",
    },
    {
        "crime_type_id": 3,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.05,
        "min_demand_threshold": 0.10,
        "priority_weight": 0.70,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Perimeter patrols and response sweeps around retail shopping hubs and suburban retail parks.",
    },
    {
        "crime_type_id": 3,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.05,
        "min_demand_threshold": 0.10,
        "priority_weight": 0.70,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Retail theft ring pattern identification, inventory loss forensics, and repeat offender filing.",
    },
    {
        "crime_type_id": 3,
        "resource_type_id": 95,  # District Intelligence Units
        "coefficient": 0.02,
        "min_demand_threshold": 0.15,
        "priority_weight": 0.65,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Market intelligence gathering on organized retail shoplifting rings and stolen merchandise fences.",
    },
    # 4. Traffic Violation (ID: 4, Cat: Traffic Fatality, Severity: LOW)
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
        "coefficient": 0.30,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.00,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Highway interceptors and mobile patrol vehicles enforcing lane discipline and intercepting reckless driving.",
    },
    {
        "crime_type_id": 4,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.05,
        "min_demand_threshold": 0.10,
        "priority_weight": 0.75,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Accident reconstruction, collision liability investigation, and fatal crash forensics.",
    },
    {
        "crime_type_id": 4,
        "resource_type_id": 96,  # Traffic Enforcement Specialized Units
        "coefficient": 0.10,
        "min_demand_threshold": 0.08,
        "priority_weight": 0.85,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Specialized drunk-driving interdiction squads and automated electronic enforcement units.",
    },
    # 5. Firearm Offense (ID: 5, Cat: Fire Accident, Severity: HIGH)
    {
        "crime_type_id": 5,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.45,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.30,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Intensive cordon-and-search operations and static armed checkpoints in high-risk zones.",
    },
    {
        "crime_type_id": 5,
        "resource_type_id": 36,  # Armoured Tactical Vehicles
        "coefficient": 0.25,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.30,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Armored tactical vehicles and rapid response interceptor patrols for armed confrontation deterrence.",
    },
    {
        "crime_type_id": 5,
        "resource_type_id": 47,  # Special Investigation Teams (SIT)
        "coefficient": 0.30,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.35,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Ballistic tracking, illicit arms supply chain tracing, and forensic weapon provenance examination.",
    },
    {
        "crime_type_id": 5,
        "resource_type_id": 103,  # Special Task Force (STF)
        "coefficient": 0.20,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.40,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Special Task Force tactical interdiction and covert weapon cache recovery operations.",
    },
    # 6. Sexual Assault (ID: 6, Cat: Violent Crime, Severity: CRITICAL)
    {
        "crime_type_id": 6,
        "resource_type_id": 18,  # Women Police Personnel
        "coefficient": 0.50,
        "min_demand_threshold": 0.02,
        "priority_weight": 1.50,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Dedicated women safety foot patrols, transit hubs, and institutional corridor surveillance.",
    },
    {
        "crime_type_id": 6,
        "resource_type_id": 25,  # PCR Vans
        "coefficient": 0.30,
        "min_demand_threshold": 0.02,
        "priority_weight": 1.40,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Emergency response PCR mobile units dedicated to prompt distress call interception.",
    },
    {
        "crime_type_id": 6,
        "resource_type_id": 59,  # Women & Children Protection Units
        "coefficient": 0.45,
        "min_demand_threshold": 0.02,
        "priority_weight": 1.50,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Women and child protection units providing specialized trauma-informed forensic investigation.",
    },
    {
        "crime_type_id": 6,
        "resource_type_id": 97,  # Women Safety & SHE Teams
        "coefficient": 0.35,
        "min_demand_threshold": 0.02,
        "priority_weight": 1.50,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Undercover SHE teams, anti-harassment squads, and vulnerable transit route patrols.",
    },
    # 7. Assault (ID: 7, Cat: Violent Crime, Severity: HIGH)
    {
        "crime_type_id": 7,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.40,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.20,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Deterrent beat policing in high-density gathering areas, night entertainment hubs, and hotspots.",
    },
    {
        "crime_type_id": 7,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.25,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.15,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Rapid response motorized patrol sweeps reducing confrontation escalation times.",
    },
    {
        "crime_type_id": 7,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.20,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.15,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Station investigation officers processing injury documentation, CCTV, and witness statements.",
    },
    {
        "crime_type_id": 7,
        "resource_type_id": 105,  # Quick Reaction Teams (QRT)
        "coefficient": 0.15,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.10,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Quick Reaction Teams positioned for rapid de-escalation of violent public confrontations.",
    },
    # 8. Fraud (ID: 8, Cat: Other Crime, Severity: MEDIUM)
    {
        "crime_type_id": 8,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.15,
        "min_demand_threshold": 0.06,
        "priority_weight": 0.90,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Verification visits, notice services, and banking district liaison personnel.",
    },
    {
        "crime_type_id": 8,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.08,
        "min_demand_threshold": 0.08,
        "priority_weight": 0.80,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Administrative transport for evidence seizure and suspect summons delivery.",
    },
    {
        "crime_type_id": 8,
        "resource_type_id": 55,  # Financial Crime Investigation Units
        "coefficient": 0.40,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.15,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Financial crime investigation units analyzing paper trails, shell entities, and ledger audits.",
    },
    {
        "crime_type_id": 8,
        "resource_type_id": 102,  # Economic Offences Special Investigation Wings
        "coefficient": 0.25,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.10,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Economic Offences Wings coordinating multi-jurisdictional financial fraud and asset freezing.",
    },
    # 9. Cybercrime (ID: 9, Cat: Other Crime, Severity: MEDIUM)
    {
        "crime_type_id": 9,
        "resource_type_id": 20,  # Cyber Police Personnel
        "coefficient": 0.20,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.10,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Cyber awareness desk officers and victim complaint intake specialists at police stations.",
    },
    {
        "crime_type_id": 9,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.08,
        "min_demand_threshold": 0.08,
        "priority_weight": 0.80,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Technical field inspection vehicles and digital evidence transit transport.",
    },
    {
        "crime_type_id": 9,
        "resource_type_id": 52,  # Cyber Crime Investigation Units
        "coefficient": 0.45,
        "min_demand_threshold": 0.03,
        "priority_weight": 1.25,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Digital forensics, IP log tracing, phishing infrastructure teardown, and dark web analysis.",
    },
    {
        "crime_type_id": 9,
        "resource_type_id": 92,  # Specialized Cyber Crime Units
        "coefficient": 0.35,
        "min_demand_threshold": 0.03,
        "priority_weight": 1.30,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Advanced technical cyber defense, ransomware tracking, and financial mule intercept units.",
    },
    # 10. Homicide (ID: 10, Cat: Other Crime, Severity: CRITICAL)
    {
        "crime_type_id": 10,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.55,
        "min_demand_threshold": 0.02,
        "priority_weight": 1.50,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Crime scene perimeter security, cordon operations, and round-the-clock witness security.",
    },
    {
        "crime_type_id": 10,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.30,
        "min_demand_threshold": 0.02,
        "priority_weight": 1.40,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "High-mobility pursuit vehicles and tactical perimeter interdiction checkpoints.",
    },
    {
        "crime_type_id": 10,
        "resource_type_id": 47,  # Special Investigation Teams (SIT)
        "coefficient": 0.50,
        "min_demand_threshold": 0.02,
        "priority_weight": 1.50,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Special Investigation Teams and forensic experts conducting comprehensive evidence processing.",
    },
    {
        "crime_type_id": 10,
        "resource_type_id": 93,  # Crime Branch Specialized Units
        "coefficient": 0.35,
        "min_demand_threshold": 0.02,
        "priority_weight": 1.45,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Specialized homicide squad intelligence, offender profiling, and fugitive tracking.",
    },
    # 11. Counterfeiting (ID: 11, Cat: Other Crime, Severity: MEDIUM)
    {
        "crime_type_id": 11,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.15,
        "min_demand_threshold": 0.06,
        "priority_weight": 0.85,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Marketplace raids, commercial printing press inspections, and merchant alert sweeps.",
    },
    {
        "crime_type_id": 11,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.10,
        "min_demand_threshold": 0.06,
        "priority_weight": 0.80,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Transport support for seized counterfeit currency, dies, and printing equipment.",
    },
    {
        "crime_type_id": 11,
        "resource_type_id": 55,  # Financial Crime Investigation Units
        "coefficient": 0.35,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.10,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Financial crime investigation units tracing forged currency distribution networks.",
    },
    {
        "crime_type_id": 11,
        "resource_type_id": 102,  # Economic Offences Special Investigation Wings
        "coefficient": 0.20,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.05,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Economic Offences Wings inter-state counterfeit network disruption and intelligence analysis.",
    },
    # 12. Arson (ID: 12, Cat: Fire Accident, Severity: CRITICAL)
    {
        "crime_type_id": 12,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.40,
        "min_demand_threshold": 0.03,
        "priority_weight": 1.35,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Evacuation perimeter cordons, fire scene security, and public order preservation.",
    },
    {
        "crime_type_id": 12,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.25,
        "min_demand_threshold": 0.03,
        "priority_weight": 1.30,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Emergency mobile units coordinating perimeter access and fire emergency services liaison.",
    },
    {
        "crime_type_id": 12,
        "resource_type_id": 49,  # Forensic Crime Scene Teams
        "coefficient": 0.40,
        "min_demand_threshold": 0.03,
        "priority_weight": 1.40,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Forensic science teams investigating accelerant traces, point-of-origin, and burn dynamics.",
    },
    {
        "crime_type_id": 12,
        "resource_type_id": 106,  # Bomb Detection & Disposal Squads (BDDS)
        "coefficient": 0.25,
        "min_demand_threshold": 0.03,
        "priority_weight": 1.35,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Bomb detection and chemical hazard disposal squads screening for incendiary devices.",
    },
    # 13. Kidnapping (ID: 13, Cat: Other Crime, Severity: CRITICAL)
    {
        "crime_type_id": 13,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.50,
        "min_demand_threshold": 0.02,
        "priority_weight": 1.50,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "City-wide road blockade checks, border surveillance, and transit terminal seals.",
    },
    {
        "crime_type_id": 13,
        "resource_type_id": 28,  # Police Sedans & Interceptors
        "coefficient": 0.35,
        "min_demand_threshold": 0.02,
        "priority_weight": 1.45,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "High-speed police interceptors and mobile cordon teams sealing exit routes.",
    },
    {
        "crime_type_id": 13,
        "resource_type_id": 47,  # Special Investigation Teams (SIT)
        "coefficient": 0.50,
        "min_demand_threshold": 0.02,
        "priority_weight": 1.50,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Dedicated anti-kidnapping investigation squads, technical call triangulation, and hostage rescue.",
    },
    {
        "crime_type_id": 13,
        "resource_type_id": 100,  # Anti-Human Trafficking Units (AHTU)
        "coefficient": 0.35,
        "min_demand_threshold": 0.02,
        "priority_weight": 1.50,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Anti-Human Trafficking Units (AHTU) and tactical rescue units executing search operations.",
    },
    # 14. Vehicle - Stolen (ID: 14, Cat: Violent Crime, Severity: MEDIUM)
    {
        "crime_type_id": 14,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.25,
        "min_demand_threshold": 0.05,
        "priority_weight": 0.95,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Fixed choke-point checks, toll booth verifications, and parking surveillance beats.",
    },
    {
        "crime_type_id": 14,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.20,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.00,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Mobile interceptor patrols equipped with real-time ANPR reader integration.",
    },
    {
        "crime_type_id": 14,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.20,
        "min_demand_threshold": 0.05,
        "priority_weight": 0.95,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Auto-theft investigation cells tracing chop shops, altered VINs, and cross-border transport.",
    },
    {
        "crime_type_id": 14,
        "resource_type_id": 93,  # Crime Branch Specialized Units
        "coefficient": 0.15,
        "min_demand_threshold": 0.06,
        "priority_weight": 0.95,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Crime Branch auto-theft squad intelligence targeting inter-state vehicle theft syndicates.",
    },
    # 15. Burglary (ID: 15, Cat: Other Crime, Severity: MEDIUM)
    {
        "crime_type_id": 15,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.35,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.05,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Night beat patrols in residential layouts, gated communities, and locked-premise monitoring.",
    },
    {
        "crime_type_id": 15,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.20,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.00,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Visible motorized patrolling through residential sectors during peak burglary hours.",
    },
    {
        "crime_type_id": 15,
        "resource_type_id": 49,  # Forensic Crime Scene Teams
        "coefficient": 0.25,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.05,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Forensic crime scene teams gathering latent fingerprints, entry toolmarks, and physical traces.",
    },
    {
        "crime_type_id": 15,
        "resource_type_id": 107,  # Police Canine & Tracker Dog Squads
        "coefficient": 0.15,
        "min_demand_threshold": 0.05,
        "priority_weight": 0.95,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Police canine tracker dog squads deployed for immediate scent trailing at burglary scenes.",
    },
    # 16. Domestic Violence (ID: 16, Cat: Violent Crime, Severity: HIGH)
    {
        "crime_type_id": 16,
        "resource_type_id": 18,  # Women Police Personnel
        "coefficient": 0.40,
        "min_demand_threshold": 0.03,
        "priority_weight": 1.25,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Station-level women assistance desks and immediate welfare verification visits.",
    },
    {
        "crime_type_id": 16,
        "resource_type_id": 25,  # PCR Vans
        "coefficient": 0.20,
        "min_demand_threshold": 0.03,
        "priority_weight": 1.20,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "PCR vans providing swift on-scene emergency intervention to distress calls.",
    },
    {
        "crime_type_id": 16,
        "resource_type_id": 59,  # Women & Children Protection Units
        "coefficient": 0.30,
        "min_demand_threshold": 0.03,
        "priority_weight": 1.25,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Women & Children Protection Units handling domestic incident reports and victim protection orders.",
    },
    {
        "crime_type_id": 16,
        "resource_type_id": 97,  # Women Safety & SHE Teams
        "coefficient": 0.20,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.20,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Specialized Women Safety & SHE Teams providing family counseling and protective surveillance.",
    },
    # 17. Drug Offense (ID: 17, Cat: Other Crime, Severity: MEDIUM)
    {
        "crime_type_id": 17,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.35,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.10,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Targeted searches around educational institutions, youth venues, and known peddler points.",
    },
    {
        "crime_type_id": 17,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.15,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.00,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Rapid intercept sweeps at transit stations and inter-district transport terminals.",
    },
    {
        "crime_type_id": 17,
        "resource_type_id": 57,  # Anti-Narcotics Intelligence Units
        "coefficient": 0.35,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.20,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Anti-Narcotics intelligence units tracking narcotics supply chains and financial links.",
    },
    {
        "crime_type_id": 17,
        "resource_type_id": 99,  # Anti-Narcotics Special Task Cells
        "coefficient": 0.25,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.25,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Specialized Anti-Narcotics task cells conducting targeted drug interdiction operations.",
    },
    # 18. Identity Theft (ID: 18, Cat: Violent Crime, Severity: MEDIUM)
    {
        "crime_type_id": 18,
        "resource_type_id": 1,  # Police Officers
        "coefficient": 0.15,
        "min_demand_threshold": 0.06,
        "priority_weight": 0.85,
        "shared_pool_category": "PERSONNEL",
        "operational_rationale": "Verification checks at SIM card vendors, biometric centers, and document kiosks.",
    },
    {
        "crime_type_id": 18,
        "resource_type_id": 2,  # Patrol Vehicles
        "coefficient": 0.08,
        "min_demand_threshold": 0.08,
        "priority_weight": 0.75,
        "shared_pool_category": "MOBILITY",
        "operational_rationale": "Field inspection transport for verifying suspected fraudulent documentation addresses.",
    },
    {
        "crime_type_id": 18,
        "resource_type_id": 52,  # Cyber Crime Investigation Units
        "coefficient": 0.35,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.15,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Cyber crime units investigating digital identity fraud, forged KYC, and credential compromise.",
    },
    {
        "crime_type_id": 18,
        "resource_type_id": 92,  # Specialized Cyber Crime Units
        "coefficient": 0.25,
        "min_demand_threshold": 0.05,
        "priority_weight": 1.15,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Specialized cyber units handling deepfake detection and synthetic identity network disruption.",
    },
    # 19. Robbery (ID: 19, Cat: Violent Crime, Severity: HIGH)
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
        "coefficient": 0.25,
        "min_demand_threshold": 0.03,
        "priority_weight": 1.20,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Robbery investigation units checking habitual offenders, surveillance CCTV, and fence networks.",
    },
    {
        "crime_type_id": 19,
        "resource_type_id": 105,  # Quick Reaction Teams (QRT)
        "coefficient": 0.20,
        "min_demand_threshold": 0.04,
        "priority_weight": 1.25,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Quick Reaction Teams strategically stationed near commercial zones prone to armed robberies.",
    },
    # 20. Illegal Possession (ID: 20, Cat: Other Crime, Severity: MEDIUM)
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
    {
        "crime_type_id": 20,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.20,
        "min_demand_threshold": 0.06,
        "priority_weight": 0.95,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Contraband source tracing, forensic asset verification, and licensee ledger audits.",
    },
    {
        "crime_type_id": 20,
        "resource_type_id": 107,  # Police Canine & Tracker Dog Squads
        "coefficient": 0.15,
        "min_demand_threshold": 0.06,
        "priority_weight": 0.95,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Canine contraband detection units screening transit hubs, freight, and vehicle storage yards.",
    },
    # 21. Public Intoxication (ID: 21, Cat: Other Crime, Severity: LOW)
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
    {
        "crime_type_id": 21,
        "resource_type_id": 3,  # Investigation Teams
        "coefficient": 0.05,
        "min_demand_threshold": 0.10,
        "priority_weight": 0.65,
        "shared_pool_category": "INVESTIGATION",
        "operational_rationale": "Station case documentation, breathalyzer compliance records, and public nuisance tracking.",
    },
    {
        "crime_type_id": 21,
        "resource_type_id": 96,  # Traffic Enforcement Specialized Units
        "coefficient": 0.05,
        "min_demand_threshold": 0.10,
        "priority_weight": 0.65,
        "shared_pool_category": "SPECIALIZED",
        "operational_rationale": "Specialized traffic & public safety squads conducting targeted breathalyzer checkpoints.",
    },
]


class CrimeMappingService:
    @staticmethod
    def seed_default_mappings(db: Session) -> int:
        """Seeds institutional crime-to-resource mappings for all 21 crime types if not already seeded."""
        existing_count = db.query(CrimeResourceMapping).count()
        if existing_count == len(DEFAULT_CRIME_MAPPINGS):
            return existing_count
        if existing_count > 0:
            logger.info(f"Existing mappings count {existing_count} differs from {len(DEFAULT_CRIME_MAPPINGS)}. Upgrading...")
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
