"""
Database seeder for comprehensive police resource types.
Seeds normalized resource types covering all operations categories:
Personnel, Mobility, Investigation, Surveillance, Infrastructure,
Specialized Units, Emergency Response, and Station Capacity.
"""

import sys
import os
from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from backend.app.database.session import SessionLocal

RESOURCE_TAXONOMY = [
    # Category A: Personnel
    {
        "id": 1,
        "code": "POLICE_PERSONNEL_ACTUAL",
        "resource_name": "Police Officers",
        "category": "PERSONNEL",
        "unit_of_measure": "Personnel",
        "description": "Total on-duty civil and armed police personnel serving across ranks.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "POLICE_PERSONNEL_TOTAL",
        "resource_name": "Total Police Personnel Strength",
        "category": "PERSONNEL",
        "unit_of_measure": "Personnel",
        "description": "Total combined police personnel including civil, armed, and reserve forces.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "POLICE_PERSONNEL_SANCTIONED",
        "resource_name": "Sanctioned Police Personnel",
        "category": "PERSONNEL",
        "unit_of_measure": "Personnel",
        "description": "Government officially sanctioned total police posts.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "POLICE_PERSONNEL_VACANCY",
        "resource_name": "Police Personnel Vacancies",
        "category": "PERSONNEL",
        "unit_of_measure": "Personnel",
        "description": "Shortfall of actual police strength relative to sanctioned posts.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "CIVIL_POLICE",
        "resource_name": "Civil Police Personnel",
        "category": "PERSONNEL",
        "unit_of_measure": "Personnel",
        "description": "Civil police officers deployed for law and order and community policing.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "ARMED_POLICE",
        "resource_name": "Armed Police Battalions",
        "category": "PERSONNEL",
        "unit_of_measure": "Personnel",
        "description": "State armed police personnel deployed for tactical security and riot response.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "DISTRICT_ARMED_RESERVE",
        "resource_name": "District Armed Reserve",
        "category": "PERSONNEL",
        "unit_of_measure": "Personnel",
        "description": "Armed police reserve units stationed at district headquarters.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "DSP",
        "resource_name": "Deputy Superintendent of Police (DSP/ASP)",
        "category": "PERSONNEL",
        "unit_of_measure": "Officers",
        "description": "Sub-divisional and supervisory gazetted police officers.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "ACP",
        "resource_name": "Assistant Commissioner of Police (ACP)",
        "category": "PERSONNEL",
        "unit_of_measure": "Officers",
        "description": "City commissionerate sub-divisional police leadership officers.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "INSPECTOR",
        "resource_name": "Police Inspectors",
        "category": "PERSONNEL",
        "unit_of_measure": "Officers",
        "description": "Station house officers (SHO) and circle lead investigative officers.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "SUB_INSPECTOR",
        "resource_name": "Sub-Inspectors of Police (SI)",
        "category": "PERSONNEL",
        "unit_of_measure": "Officers",
        "description": "Primary case investigation and station executive officers.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "ASSISTANT_SUB_INSPECTOR",
        "resource_name": "Assistant Sub-Inspectors (ASI)",
        "category": "PERSONNEL",
        "unit_of_measure": "Officers",
        "description": "First-line supervisory and auxiliary investigating officers.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "HEAD_CONSTABLE",
        "resource_name": "Head Constables",
        "category": "PERSONNEL",
        "unit_of_measure": "Personnel",
        "description": "Senior constabulary personnel managing beats and general diary registers.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "CONSTABLE",
        "resource_name": "Police Constables",
        "category": "PERSONNEL",
        "unit_of_measure": "Personnel",
        "description": "Frontline constabulary personnel deployed on field beats and escort duty.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "WOMEN_POLICE_PERSONNEL",
        "resource_name": "Women Police Personnel",
        "category": "PERSONNEL",
        "unit_of_measure": "Personnel",
        "description": "Female police personnel across all administrative and operational ranks.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "TRAFFIC_POLICE",
        "resource_name": "Traffic Police Personnel",
        "category": "PERSONNEL",
        "unit_of_measure": "Personnel",
        "description": "Personnel dedicated to traffic regulation and road safety enforcement.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "CYBER_POLICE",
        "resource_name": "Cyber Police Personnel",
        "category": "PERSONNEL",
        "unit_of_measure": "Personnel",
        "description": "Sworn officers and cyber forensic specialists handling digital crime cases.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "SPECIAL_BRANCH_PERSONNEL",
        "resource_name": "Special Branch Personnel",
        "category": "PERSONNEL",
        "unit_of_measure": "Personnel",
        "description": "Intelligence gathering and security verification officers.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "CRIME_BRANCH_PERSONNEL",
        "resource_name": "Crime Branch Personnel",
        "category": "PERSONNEL",
        "unit_of_measure": "Personnel",
        "description": "Detectives handling organized crime, homicide, and major cases.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },

    # Category B: Mobility
    {
        "code": "POLICE_VEHICLES_TOTAL",
        "resource_name": "Total Police Vehicles Fleet",
        "category": "MOBILITY",
        "unit_of_measure": "Vehicles",
        "description": "Total motorized transport fleet provided to state and district police organizations.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "id": 2,
        "code": "PATROL_VEHICLES",
        "resource_name": "Patrol Vehicles",
        "category": "MOBILITY",
        "unit_of_measure": "Vehicles",
        "description": "Dedicated police utility vehicles and cars assigned to active mobile patrol beats.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "HIGHWAY_PATROL_VEHICLES",
        "resource_name": "Highway Patrol Vehicles",
        "category": "MOBILITY",
        "unit_of_measure": "Vehicles",
        "description": "Specialized high-speed interceptor vehicles equipped with speed radars and medical kits.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "PCR_VANS",
        "resource_name": "Police Control Room (PCR) Vans",
        "category": "MOBILITY",
        "unit_of_measure": "Vehicles",
        "description": "Mobile command vans responding to 24/7 emergency dispatch calls.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "PRISONER_VANS",
        "resource_name": "Prisoner Transport Vans",
        "category": "MOBILITY",
        "unit_of_measure": "Vehicles",
        "description": "Secure transport vans for prisoner court and correctional facility transit.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "POLICE_JEEPS",
        "resource_name": "Police Utility Jeeps & SUVs",
        "category": "MOBILITY",
        "unit_of_measure": "Vehicles",
        "description": "Rugged all-terrain light utility vehicles for rural and urban policing.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "POLICE_CARS",
        "resource_name": "Police Sedans & Interceptors",
        "category": "MOBILITY",
        "unit_of_measure": "Vehicles",
        "description": "Urban patrol cars and supervisory administrative transport vehicles.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "POLICE_MOTORCYCLES",
        "resource_name": "Police Motorcycles",
        "category": "MOBILITY",
        "unit_of_measure": "Vehicles",
        "description": "Two-wheeler patrol motorcycles for narrow alleys and traffic response.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "POLICE_SCOOTERS",
        "resource_name": "Police Scooters",
        "category": "MOBILITY",
        "unit_of_measure": "Vehicles",
        "description": "Lightweight two-wheelers for community beat officers and women safety teams.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "POLICE_TRUCKS",
        "resource_name": "Heavy Duty Police Trucks",
        "category": "MOBILITY",
        "unit_of_measure": "Vehicles",
        "description": "Heavy-duty troop carriers and logistics supply trucks.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "POLICE_BUSES",
        "resource_name": "Medium Duty Police Buses",
        "category": "MOBILITY",
        "unit_of_measure": "Vehicles",
        "description": "Personnel transit buses for battalion mobilization and law-and-order deployment.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "EMERGENCY_RESPONSE_VEHICLES",
        "resource_name": "Emergency Response Vehicles (ERV)",
        "category": "MOBILITY",
        "unit_of_measure": "Vehicles",
        "description": "First-responder vehicles integrated with GPS and mobile computer terminals.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "DIAL_112_VEHICLES",
        "resource_name": "Dial 112 Emergency Mobile Units",
        "category": "MOBILITY",
        "unit_of_measure": "Vehicles",
        "description": "Designated emergency response vehicles operating under nationwide ERSS 112.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "DIAL_100_VEHICLES",
        "resource_name": "Dial 100 Mobile Response Units",
        "category": "MOBILITY",
        "unit_of_measure": "Vehicles",
        "description": "Municipal emergency response police patrol vehicles.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "ARMOURED_VEHICLES",
        "resource_name": "Armoured Tactical Vehicles",
        "category": "MOBILITY",
        "unit_of_measure": "Vehicles",
        "description": "Bulletproof and mine-protected tactical transport vehicles.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "WATER_CANNONS",
        "resource_name": "Crowd Control Water Cannons",
        "category": "MOBILITY",
        "unit_of_measure": "Vehicles",
        "description": "Non-lethal riot control water cannon deployment units.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "SPECIAL_PURPOSE_VEHICLES",
        "resource_name": "Special Purpose Tactical Vehicles",
        "category": "MOBILITY",
        "unit_of_measure": "Vehicles",
        "description": "Bomb squad vehicles, command posts, and forensic support transport.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "BOATS",
        "resource_name": "Police Coastal & Riverine Boats",
        "category": "MOBILITY",
        "unit_of_measure": "Watercraft",
        "description": "Coastal security and riverine patrol boats under Coastal Security Scheme.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "POLICE_WATERCRAFT",
        "resource_name": "Police High-Speed Watercraft",
        "category": "MOBILITY",
        "unit_of_measure": "Watercraft",
        "description": "High-speed interceptor rigid-inflatable and fiberglass patrol boats.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "AIRCRAFT",
        "resource_name": "Police Surveillance Aircraft",
        "category": "MOBILITY",
        "unit_of_measure": "Aircraft",
        "description": "Fixed-wing surveillance and border monitoring aircraft.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "POLICE_HELICOPTERS",
        "resource_name": "Police Tactical Helicopters",
        "category": "MOBILITY",
        "unit_of_measure": "Aircraft",
        "description": "Helicopters deployed for aerial reconnaissance, VIP escort, and disaster relief.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "DRONES",
        "resource_name": "Tactical Patrol & Reconnaissance Drones",
        "category": "MOBILITY",
        "unit_of_measure": "Drones",
        "description": "Unmanned aerial vehicles (UAV) deployed for crowd management and perimeter surveillance.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": True, "is_infrastructure": False
    },

    # Category C: Investigation
    {
        "code": "INVESTIGATION_OFFICERS",
        "resource_name": "Designated Investigating Officers",
        "category": "INVESTIGATION",
        "unit_of_measure": "Officers",
        "description": "Trained officers legally empowered to investigate cognizable offences under CrPC/BNSS.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "id": 3,
        "code": "INVESTIGATION_TEAMS",
        "resource_name": "Investigation Teams",
        "category": "INVESTIGATION",
        "unit_of_measure": "Teams",
        "description": "Specialized investigative units tasked with felony case processing and charge-sheet preparation.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "CRIME_INVESTIGATION_UNITS",
        "resource_name": "Crime Investigation Units (CIU)",
        "category": "INVESTIGATION",
        "unit_of_measure": "Units",
        "description": "District-level operational units tackling burglary, homicide, and organized gangs.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "DISTRICT_CRIME_BRANCH",
        "resource_name": "District Crime Branch Teams",
        "category": "INVESTIGATION",
        "unit_of_measure": "Teams",
        "description": "Dedicated squads focused on interstate crimes, major swindles, and cold cases.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "SPECIAL_INVESTIGATION_TEAMS",
        "resource_name": "Special Investigation Teams (SIT)",
        "category": "INVESTIGATION",
        "unit_of_measure": "Teams",
        "description": "Case-specific high-level probe teams constituted for sensitive cases.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "SPECIAL_INVESTIGATION_UNITS",
        "resource_name": "Special Investigation Units (SIU)",
        "category": "INVESTIGATION",
        "unit_of_measure": "Units",
        "description": "Permanent specialized probe divisions for high-profile offenses.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "FORENSIC_TEAMS",
        "resource_name": "Forensic Crime Scene Teams",
        "category": "INVESTIGATION",
        "unit_of_measure": "Teams",
        "description": "Scientific crime scene examination teams handling biological, ballistics, and trace evidence.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "MOBILE_FORENSIC_UNITS",
        "resource_name": "Mobile Forensic Science Units",
        "category": "INVESTIGATION",
        "unit_of_measure": "Units",
        "description": "Mobile scientific examination vans deployed directly to felony scenes.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "FORENSIC_VEHICLES",
        "resource_name": "Forensic Support Vehicles",
        "category": "INVESTIGATION",
        "unit_of_measure": "Vehicles",
        "description": "Vehicles outfitted with scientific testing kits, latent fingerprint developers, and lighting.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "CYBER_CRIME_UNITS",
        "resource_name": "Cyber Crime Investigation Units",
        "category": "INVESTIGATION",
        "unit_of_measure": "Units",
        "description": "Digital evidence acquisition and analysis squads tackling cyber frauds and intrusions.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "CYBER_CRIME_PERSONNEL",
        "resource_name": "Cyber Crime Technical Analysts",
        "category": "INVESTIGATION",
        "unit_of_measure": "Personnel",
        "description": "Cyber investigators trained in CDR analysis, OSINT, and hard drive forensics.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "CYBER_INVESTIGATION_TEAMS",
        "resource_name": "Cyber Investigation Operational Teams",
        "category": "INVESTIGATION",
        "unit_of_measure": "Teams",
        "description": "Field operational teams executing raids and confiscations in cybercrime cases.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "FINANCIAL_CRIME_UNITS",
        "resource_name": "Financial Crime Investigation Units",
        "category": "INVESTIGATION",
        "unit_of_measure": "Units",
        "description": "Specialized teams probing bank frauds, Ponzi schemes, and corporate swindles.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "ECONOMIC_OFFENCES_UNITS",
        "resource_name": "Economic Offences Wings (EOW)",
        "category": "INVESTIGATION",
        "unit_of_measure": "Units",
        "description": "Dedicated state and district branches for large-scale economic fraud investigations.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "NARCOTICS_UNITS",
        "resource_name": "Anti-Narcotics Intelligence Units",
        "category": "INVESTIGATION",
        "unit_of_measure": "Units",
        "description": "Dedicated units interdicting drug cartels, supply chains, and NDPS violations.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "ANTI_NARCOTICS_TEAMS",
        "resource_name": "Anti-Narcotics Field Teams",
        "category": "INVESTIGATION",
        "unit_of_measure": "Teams",
        "description": "Operational teams conducting raids, border checkpoints, and contraband seizures.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "WOMEN_CHILDREN_INVESTIGATION_UNITS",
        "resource_name": "Women & Children Protection Units",
        "category": "INVESTIGATION",
        "unit_of_measure": "Units",
        "description": "Specialized cells ensuring time-bound investigation of POCSO and domestic abuse cases.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },

    # Category D: Surveillance
    {
        "id": 4,
        "code": "SURVEILLANCE_TEAMS",
        "resource_name": "Surveillance Units",
        "category": "SURVEILLANCE",
        "unit_of_measure": "Units",
        "description": "Technical teams operating electronic surveillance, wiretap, and drone deployments.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "SURVEILLANCE_PERSONNEL",
        "resource_name": "Surveillance Technical Specialists",
        "category": "SURVEILLANCE",
        "unit_of_measure": "Personnel",
        "description": "Personnel trained in physical trailing, signals monitoring, and camera network operations.",
        "is_personnel": True, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "CCTV_CAMERAS",
        "resource_name": "Surveillance CCTV Cameras",
        "category": "SURVEILLANCE",
        "unit_of_measure": "Cameras",
        "description": "Total government and municipal video surveillance cameras monitored by police.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": True, "is_infrastructure": False
    },
    {
        "code": "POLICE_CCTV_CAMERAS",
        "resource_name": "Police Owned CCTV Cameras",
        "category": "SURVEILLANCE",
        "unit_of_measure": "Cameras",
        "description": "Directly owned high-definition IP cameras deployed at major intersections and sensitive spots.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": True, "is_infrastructure": False
    },
    {
        "code": "TRAFFIC_CCTV_CAMERAS",
        "resource_name": "Traffic Enforcement CCTV Cameras",
        "category": "SURVEILLANCE",
        "unit_of_measure": "Cameras",
        "description": "Automated e-challan and traffic junction monitoring video feeds.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": True, "is_infrastructure": False
    },
    {
        "code": "CCTV_CONTROL_ROOMS",
        "resource_name": "CCTV Monitoring Control Rooms",
        "category": "SURVEILLANCE",
        "unit_of_measure": "Rooms",
        "description": "Dedicated viewing centres with video walls for real-time situational awareness.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "INTEGRATED_COMMAND_CONTROL_CENTRES",
        "resource_name": "Integrated Command & Control Centres (ICCC)",
        "category": "SURVEILLANCE",
        "unit_of_measure": "Centres",
        "description": "Smart City integrated command centres co-locating police, municipal, and traffic operations.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "COMMAND_CONTROL_CENTRES",
        "resource_name": "District Command & Control Centres",
        "category": "SURVEILLANCE",
        "unit_of_measure": "Centres",
        "description": "Central district operational dispatch and tactical coordination hubs.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "SURVEILLANCE_DRONES",
        "resource_name": "Surveillance Drones",
        "category": "SURVEILLANCE",
        "unit_of_measure": "Drones",
        "description": "Thermal and zoom equipped multi-rotor UAVs for riot and perimeter tracking.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": True, "is_infrastructure": False
    },
    {
        "code": "DRONE_TEAMS",
        "resource_name": "Operational Drone Pilot Teams",
        "category": "SURVEILLANCE",
        "unit_of_measure": "Teams",
        "description": "Certified drone pilots and tactical observer crews.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "ANPR_CAMERAS",
        "resource_name": "Automatic Number Plate Recognition (ANPR) Cameras",
        "category": "SURVEILLANCE",
        "unit_of_measure": "Cameras",
        "description": "Optical license plate reader cameras installed at toll plazas and city choke points.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": True, "is_infrastructure": False
    },
    {
        "code": "AUTOMATIC_NUMBER_PLATE_READERS",
        "resource_name": "ANPR Reader Processing Systems",
        "category": "SURVEILLANCE",
        "unit_of_measure": "Systems",
        "description": "Server clusters cross-referencing live vehicle plates against stolen vehicle databases.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": True, "is_infrastructure": False
    },
    {
        "code": "FACIAL_RECOGNITION_SYSTEMS",
        "resource_name": "Facial Recognition Surveillance Systems",
        "category": "SURVEILLANCE",
        "unit_of_measure": "Systems",
        "description": "Automated facial biometric recognition engines linked to criminal watchlists.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": True, "is_infrastructure": False
    },
    {
        "code": "BODY_WORN_CAMERAS",
        "resource_name": "Officer Body-Worn Cameras",
        "category": "SURVEILLANCE",
        "unit_of_measure": "Cameras",
        "description": "Wearable audio-video recording units deployed on frontline traffic and patrol personnel.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": True, "is_infrastructure": False
    },
    {
        "code": "GPS_TRACKED_PATROL_VEHICLES",
        "resource_name": "GPS-Tracked Emergency Patrol Vehicles",
        "category": "SURVEILLANCE",
        "unit_of_measure": "Vehicles",
        "description": "Police vehicles equipped with vehicle location tracking devices (VLTD) and mobile data terminals.",
        "is_personnel": False, "is_vehicle": True, "is_team": False, "is_equipment": False, "is_infrastructure": False
    },

    # Category E: Infrastructure
    {
        "code": "POLICE_STATIONS",
        "resource_name": "Total Police Stations",
        "category": "INFRASTRUCTURE",
        "unit_of_measure": "Stations",
        "description": "Total gazetted territorial and functional police stations operating within jurisdiction.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "POLICE_OUTPOSTS",
        "resource_name": "Police Outposts",
        "category": "INFRASTRUCTURE",
        "unit_of_measure": "Outposts",
        "description": "Subordinate police outposts establishing local presence in rural and border pockets.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "POLICE_POSTS",
        "resource_name": "Police Fixed Posts",
        "category": "INFRASTRUCTURE",
        "unit_of_measure": "Posts",
        "description": "Permanent static sentry posts securing vital installations and sensitive zones.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "POLICE_CHECK_POSTS",
        "resource_name": "Border & Highway Check Posts",
        "category": "INFRASTRUCTURE",
        "unit_of_measure": "Check Posts",
        "description": "Strategic check points conducting vehicular frisking and anti-smuggling barriers.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "DISTRICT_POLICE_OFFICES",
        "resource_name": "District Police Headquarters",
        "category": "INFRASTRUCTURE",
        "unit_of_measure": "Offices",
        "description": "Administrative headquarters housing the Superintendent of Police / Commissioner.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "SUB_DIVISIONAL_POLICE_OFFICES",
        "resource_name": "Sub-Divisional Police Offices (SDPO)",
        "category": "INFRASTRUCTURE",
        "unit_of_measure": "Offices",
        "description": "Offices of Deputy Superintendents of Police overseeing station clusters.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "CIRCLE_OFFICES",
        "resource_name": "Police Circle Offices",
        "category": "INFRASTRUCTURE",
        "unit_of_measure": "Offices",
        "description": "Offices of Circle Inspectors supervising groups of territorial police stations.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "CONTROL_ROOMS",
        "resource_name": "District Police Control Rooms",
        "category": "INFRASTRUCTURE",
        "unit_of_measure": "Rooms",
        "description": "Round-the-clock wireless and operational message exchange coordination hubs.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "EMERGENCY_CONTROL_ROOMS",
        "resource_name": "Dial 112 Integrated Emergency Control Rooms",
        "category": "INFRASTRUCTURE",
        "unit_of_measure": "Rooms",
        "description": "Emergency response support system (ERSS) public safety answering points (PSAP).",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "CYBER_POLICE_STATIONS",
        "resource_name": "Cyber Crime Police Stations",
        "category": "INFRASTRUCTURE",
        "unit_of_measure": "Stations",
        "description": "Gazetted police stations holding exclusive statutory jurisdiction over complex cyber offenses.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "WOMEN_POLICE_STATIONS",
        "resource_name": "All-Women Police Stations (AWPS)",
        "category": "INFRASTRUCTURE",
        "unit_of_measure": "Stations",
        "description": "Stations staffed predominantly by women officers specializing in gender-based violence.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "TRAFFIC_POLICE_STATIONS",
        "resource_name": "Dedicated Traffic Police Stations",
        "category": "INFRASTRUCTURE",
        "unit_of_measure": "Stations",
        "description": "Functional police stations dedicated to highway and urban traffic enforcement.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "FORENSIC_LABS",
        "resource_name": "State & Regional Forensic Laboratories",
        "category": "INFRASTRUCTURE",
        "unit_of_measure": "Labs",
        "description": "Static laboratories offering toxicology, DNA, ballistics, and cyber evidence forensics.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "REGIONAL_FORENSIC_LABS",
        "resource_name": "Regional Forensic Science Laboratories",
        "category": "INFRASTRUCTURE",
        "unit_of_measure": "Labs",
        "description": "Zonal forensic examination facilities reducing analytical turnaround time.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "MOBILE_FORENSIC_LABS",
        "resource_name": "Mobile Forensic Laboratories",
        "category": "INFRASTRUCTURE",
        "unit_of_measure": "Labs",
        "description": "Vehicle-mounted scientific laboratories capable of on-spot chemical screening.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "TRAINING_CENTRES",
        "resource_name": "Police Training Schools & Academies",
        "category": "INFRASTRUCTURE",
        "unit_of_measure": "Centres",
        "description": "Institutions conducting recruit induction, weapons handling, and refresher training.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "POLICE_HOSPITALS",
        "resource_name": "Police Hospitals & Medical Dispensaries",
        "category": "INFRASTRUCTURE",
        "unit_of_measure": "Facilities",
        "description": "Healthcare facilities providing emergency treatment and welfare for police personnel.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "POLICE_HOUSING_UNITS",
        "resource_name": "Police Residential Housing Quarters",
        "category": "INFRASTRUCTURE",
        "unit_of_measure": "Quarters",
        "description": "Departmental residential quarters allocated to officers and constabulary.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },

    # Category F: Specialized
    {
        "code": "CYBER_CRIME_UNIT",
        "resource_name": "Specialized Cyber Crime Units",
        "category": "SPECIALIZED",
        "unit_of_measure": "Units",
        "description": "Technical taskforces focusing on malware forensics and cryptocurrency fraud.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "CRIME_BRANCH",
        "resource_name": "Crime Branch Specialized Units",
        "category": "SPECIALIZED",
        "unit_of_measure": "Units",
        "description": "Premier detective wing of the police organization tackling interstate crime syndicates.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "SPECIAL_BRANCH",
        "resource_name": "Special Branch Intelligence Wings",
        "category": "SPECIALIZED",
        "unit_of_measure": "Units",
        "description": "Confidential political, security, and internal intelligence wings.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "INTELLIGENCE_UNIT",
        "resource_name": "District Intelligence Units",
        "category": "SPECIALIZED",
        "unit_of_measure": "Units",
        "description": "Tactical district information-gathering units monitoring extremist and communal threats.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "TRAFFIC_UNIT",
        "resource_name": "Traffic Enforcement Specialized Units",
        "category": "SPECIALIZED",
        "unit_of_measure": "Units",
        "description": "Specialized corridors for highway accident prevention and VIP motorcade routing.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "WOMEN_SAFETY_UNIT",
        "resource_name": "Women Safety & SHE Teams",
        "category": "SPECIALIZED",
        "unit_of_measure": "Units",
        "description": "Specialized plainclothes units curbing eve-teasing, stalkers, and public harassment.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "CHILD_PROTECTION_UNIT",
        "resource_name": "Special Juvenile Police Units (SJPU)",
        "category": "SPECIALIZED",
        "unit_of_measure": "Units",
        "description": "Statutory child-friendly police officers protecting juveniles and victims of abuse.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "ANTI_NARCOTICS_UNIT",
        "resource_name": "Anti-Narcotics Special Task Cells",
        "category": "SPECIALIZED",
        "unit_of_measure": "Units",
        "description": "Covert units targeting synthetic drug manufacturing labs and distribution rings.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "ANTI_HUMAN_TRAFFICKING_UNIT",
        "resource_name": "Anti-Human Trafficking Units (AHTU)",
        "category": "SPECIALIZED",
        "unit_of_measure": "Units",
        "description": "Multi-agency enforcement teams dedicated to rescuing trafficked women and forced laborers.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "ANTI_TERROR_UNIT",
        "resource_name": "Anti-Terror Squads (ATS)",
        "category": "SPECIALIZED",
        "unit_of_measure": "Units",
        "description": "Elite state counter-terrorism forces operating against sabotage and radical networks.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "ECONOMIC_OFFENCES_UNIT",
        "resource_name": "Economic Offences Special Investigation Wings",
        "category": "SPECIALIZED",
        "unit_of_measure": "Units",
        "description": "Specialized chartered accountant and forensic auditing assistance units.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "SPECIAL_TASK_FORCE",
        "resource_name": "Special Task Force (STF)",
        "category": "SPECIALIZED",
        "unit_of_measure": "Platoons",
        "description": "Elite commando taskforces neutralising dangerous fugitives and organized cartels.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "RAPID_RESPONSE_TEAM",
        "resource_name": "Rapid Response Strike Teams",
        "category": "SPECIALIZED",
        "unit_of_measure": "Teams",
        "description": "Heavy weapons teams on standby for hostage rescue and crisis intervention.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "QUICK_REACTION_TEAM",
        "resource_name": "Quick Reaction Teams (QRT)",
        "category": "SPECIALIZED",
        "unit_of_measure": "Teams",
        "description": "Immediate tactical reaction teams positioned across sensitive urban perimeters.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "BOMB_DISPOSAL_SQUAD",
        "resource_name": "Bomb Detection & Disposal Squads (BDDS)",
        "category": "SPECIALIZED",
        "unit_of_measure": "Squads",
        "description": "Trained ordnance technicians equipped with explosive sniffers, robots, and blast suits.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "DOG_SQUAD",
        "resource_name": "Police Canine & Tracker Dog Squads",
        "category": "SPECIALIZED",
        "unit_of_measure": "Squads",
        "description": "Trained police working dogs specializing in narcotics detection, explosives, and search.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "MOUNTED_POLICE",
        "resource_name": "Mounted Police Troop Units",
        "category": "SPECIALIZED",
        "unit_of_measure": "Troops",
        "description": "Cavalry police horse troops deployed for ceremonial duties and crowd elevation control.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },

    # Category G: Emergency Response
    {
        "code": "EMERGENCY_RESPONSE_TEAMS",
        "resource_name": "Emergency Response Field Teams",
        "category": "EMERGENCY",
        "unit_of_measure": "Teams",
        "description": "First-on-scene tactical response teams handling violent emergencies and distress alerts.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "PCR_TEAMS",
        "resource_name": "PCR Flying Squad Response Teams",
        "category": "EMERGENCY",
        "unit_of_measure": "Teams",
        "description": "PCR vehicle crews equipped with ballistic vests and first aid kits.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "DIAL_112_RESPONSE_TEAMS",
        "resource_name": "Dial 112 Mobile Emergency Response Teams",
        "category": "EMERGENCY",
        "unit_of_measure": "Teams",
        "description": "ERSS mobile response units dispatching within target standard response time.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "DIAL_100_RESPONSE_TEAMS",
        "resource_name": "Dial 100 First Responder Teams",
        "category": "EMERGENCY",
        "unit_of_measure": "Teams",
        "description": "Station-level emergency flying response teams.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },
    {
        "code": "FIRE_SERVICE_COORDINATION_UNITS",
        "resource_name": "Fire & Disaster Coordination Units",
        "category": "EMERGENCY",
        "unit_of_measure": "Units",
        "description": "Police liaisons coordinating incident command systems during major blazes and floods.",
        "is_personnel": False, "is_vehicle": False, "is_team": True, "is_equipment": False, "is_infrastructure": False
    },

    # Category H: Station Capacity
    {
        "code": "POLICE_STATION_COUNT",
        "resource_name": "Operational Police Stations Count",
        "category": "STATION_CAPACITY",
        "unit_of_measure": "Stations",
        "description": "Total functioning police stations operating within the geographic territory.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "POLICE_STATIONS_WITH_VEHICLES",
        "resource_name": "Stations Equipped with Motorized Transport",
        "category": "STATION_CAPACITY",
        "unit_of_measure": "Stations",
        "description": "Police stations having at least one operational four-wheeler or two-wheeler transport.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "POLICE_STATIONS_WITH_COMPUTERS",
        "resource_name": "Stations Equipped with Computers",
        "category": "STATION_CAPACITY",
        "unit_of_measure": "Stations",
        "description": "Police stations having desktop computers operational for official duties.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "POLICE_STATIONS_WITH_INTERNET",
        "resource_name": "Stations Connected to CCTNS Network",
        "category": "STATION_CAPACITY",
        "unit_of_measure": "Stations",
        "description": "Police stations connected with high-speed leased line or VPNoBB internet access.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "POLICE_STATIONS_WITH_CCTV",
        "resource_name": "Stations with 24x7 CCTV Coverage",
        "category": "STATION_CAPACITY",
        "unit_of_measure": "Stations",
        "description": "Police stations compliant with Supreme Court directives on CCTV recording in all areas.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "POLICE_STATIONS_WITH_WOMEN_DESKS",
        "resource_name": "Stations with Women Help Desks",
        "category": "STATION_CAPACITY",
        "unit_of_measure": "Stations",
        "description": "Police stations equipped with a dedicated, child-friendly women assistance help desk.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
    {
        "code": "POLICE_STATIONS_WITH_CYBER_SUPPORT",
        "resource_name": "Stations with Cyber Crime Help Desks",
        "category": "STATION_CAPACITY",
        "unit_of_measure": "Stations",
        "description": "Police stations equipped to register Cyber Fraud Reporting Portal (NCRP) grievances.",
        "is_personnel": False, "is_vehicle": False, "is_team": False, "is_equipment": False, "is_infrastructure": True
    },
]


def seed_resource_types():
    db = SessionLocal()
    try:
        print("Seeding comprehensive resource types...")
        inserted = 0
        updated = 0

        for item in RESOURCE_TAXONOMY:
            item_id = item.get("id")
            code = item["code"]

            if item_id:
                # Update by ID (preserves IDs 1..4)
                db.execute(
                    text("""
                        UPDATE resource_types
                        SET code = :code,
                            resource_name = :resource_name,
                            category = :category,
                            unit_of_measure = :unit_of_measure,
                            description = :description,
                            is_personnel = :is_personnel,
                            is_vehicle = :is_vehicle,
                            is_team = :is_team,
                            is_equipment = :is_equipment,
                            is_infrastructure = :is_infrastructure,
                            is_active = TRUE
                        WHERE id = :id
                    """),
                    {**item, "id": item_id}
                )
                updated += 1
            else:
                # Check by code or name
                existing = db.execute(
                    text("SELECT id FROM resource_types WHERE code = :code OR resource_name = :resource_name"),
                    {"code": code, "resource_name": item["resource_name"]}
                ).fetchone()

                if existing:
                    db.execute(
                        text("""
                            UPDATE resource_types
                            SET code = :code,
                                resource_name = :resource_name,
                                category = :category,
                                unit_of_measure = :unit_of_measure,
                                description = :description,
                                is_personnel = :is_personnel,
                                is_vehicle = :is_vehicle,
                                is_team = :is_team,
                                is_equipment = :is_equipment,
                                is_infrastructure = :is_infrastructure,
                                is_active = TRUE
                            WHERE id = :id
                        """),
                        {**item, "id": existing[0]}
                    )
                    updated += 1
                else:
                    db.execute(
                        text("""
                            INSERT INTO resource_types
                                (code, resource_name, category, unit_of_measure, description,
                                 is_personnel, is_vehicle, is_team, is_equipment, is_infrastructure, is_active)
                            VALUES
                                (:code, :resource_name, :category, :unit_of_measure, :description,
                                 :is_personnel, :is_vehicle, :is_team, :is_equipment, :is_infrastructure, TRUE)
                        """),
                        item
                    )
                    inserted += 1

        db.commit()
        total_count = db.execute(text("SELECT COUNT(*) FROM resource_types")).scalar()
        print(f"Seeding completed. Total resource types: {total_count} (Updated: {updated}, Inserted: {inserted})")
    except Exception as e:
        db.rollback()
        print(f"Error seeding resource types: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_resource_types()
