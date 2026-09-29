from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from backend.app.models.geography import State, District, DistrictGeographyMapping


class GeographyRepository:
    @staticmethod
    def get_all_states(db: Session, view: str = "current") -> List[State]:
        query = db.query(State)
        if view == "current":
            query = query.filter(State.is_active == True)  # 36 active States + UTs
        elif view == "historical":
            query = query.filter(State.id <= 35)           # 35 Census 2011 States/UTs
        # Order states alphabetically
        return query.order_by(State.state_name.asc()).all()

    @staticmethod
    def get_districts(
        db: Session,
        state_id: Optional[int] = None,
        view: str = "current",
    ) -> List[District]:
        query = db.query(District).options(
            joinedload(District.state),
            joinedload(District.parent_district),
        )

        if view == "current":
            query = query.filter(District.is_current_admin == True)
        elif view == "historical":
            query = query.filter(District.is_census_2011 == True)

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
                joinedload(District.parent_district),
            )
            .filter(District.id == district_id)
            .first()
        )

    @staticmethod
    def get_district_mappings(
        db: Session,
        historical_district_id: Optional[int] = None,
        current_district_id: Optional[int] = None,
    ) -> List[DistrictGeographyMapping]:
        query = db.query(DistrictGeographyMapping).options(
            joinedload(DistrictGeographyMapping.historical_district).joinedload(District.state),
            joinedload(DistrictGeographyMapping.current_district).joinedload(District.state),
        )

        if historical_district_id is not None:
            query = query.filter(DistrictGeographyMapping.historical_district_id == historical_district_id)
        if current_district_id is not None:
            query = query.filter(DistrictGeographyMapping.current_district_id == current_district_id)

        return query.order_by(DistrictGeographyMapping.id.asc()).all()
