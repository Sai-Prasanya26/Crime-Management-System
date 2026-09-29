from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from backend.app.models.geography import State, District


class GeographyRepository:
    @staticmethod
    def get_all_states(db: Session) -> List[State]:
        return db.query(State).order_by(State.state_name.asc()).all()

    @staticmethod
    def get_districts(db: Session, state_id: Optional[int] = None) -> List[District]:
        query = db.query(District).options(joinedload(District.state))
        if state_id is not None:
            query = query.filter(District.state_id == state_id)
        return query.order_by(District.district_name.asc()).all()

    @staticmethod
    def get_district_by_id(db: Session, district_id: int) -> Optional[District]:
        return (
            db.query(District)
            .options(
                joinedload(District.state),
                joinedload(District.demographics),
            )
            .filter(District.id == district_id)
            .first()
        )
