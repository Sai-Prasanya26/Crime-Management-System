from backend.app.database.session import SessionLocal
from backend.app.models.resources import ResourceType

def seed_resource_types():
    db = SessionLocal()
    new_types = [
        {
            'id': 121,
            'code': 'FORENSIC_EXAM_CAP',
            'resource_name': 'Forensic Examination Capacity',
            'category': 'FORENSIC',
            'unit_of_measure': 'Tests/Month',
            'description': 'Forensic fingerprint, DNA, and physical crime-scene laboratory processing capacity.',
            'is_equipment': True,
        },
        {
            'id': 122,
            'code': 'CYBER_FORENSIC_WS',
            'resource_name': 'Digital Forensic Workstations',
            'category': 'CYBER_TECHNOLOGY',
            'unit_of_measure': 'Workstations',
            'description': 'Hardware write-blockers, forensic imaging workstations, and cyber evidence analysis tools.',
            'is_equipment': True,
        },
        {
            'id': 123,
            'code': 'EMERGENCY_MED_RESP',
            'resource_name': 'Emergency Medical Response Units',
            'category': 'EMERGENCY_RESPONSE',
            'unit_of_measure': 'Ambulances',
            'description': 'External partner-agency EMS ambulances, medical trauma teams, and hospital casualty liaison.',
            'is_vehicle': True,
            'is_equipment': True,
        },
        {
            'id': 124,
            'code': 'POLICE_RADIO_DISPATCH',
            'resource_name': 'Police Radio & Dispatch Consoles',
            'category': 'COMMUNICATION',
            'unit_of_measure': 'Channels',
            'description': 'Police radio handsets, repeater infrastructure, and CAD emergency coordination dispatch capacity.',
            'is_equipment': True,
        },
        {
            'id': 125,
            'code': 'TRAFFIC_SAFETY_DEV',
            'resource_name': 'Traffic Safety Enforcement Devices',
            'category': 'TRAFFIC_SAFETY',
            'unit_of_measure': 'Devices',
            'description': 'Speed enforcement radars, calibrated breathalyzers, and automated traffic safety monitoring equipment.',
            'is_equipment': True,
        },
    ]

    for t in new_types:
        existing = db.query(ResourceType).filter(ResourceType.id == t['id']).first()
        if not existing:
            rt = ResourceType(
                id=t['id'],
                code=t['code'],
                resource_name=t['resource_name'],
                category=t['category'],
                unit_of_measure=t['unit_of_measure'],
                description=t['description'],
                is_personnel=t.get('is_personnel', False),
                is_vehicle=t.get('is_vehicle', False),
                is_team=t.get('is_team', False),
                is_equipment=t.get('is_equipment', False),
                is_infrastructure=t.get('is_infrastructure', False),
                is_active=True,
            )
            db.add(rt)
            print(f"Added ResourceType {t['id']}: {t['resource_name']}")
        else:
            print(f"ResourceType {t['id']} already exists.")

    db.commit()
    db.close()

if __name__ == '__main__':
    seed_resource_types()
