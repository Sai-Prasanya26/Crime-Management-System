from sqlalchemy.orm import Session
from typing import Optional, Tuple
from datetime import date
from backend.app.models.geography import District
from backend.app.repositories.crime_repository import CrimeRepository
from backend.app.schemas.analytics import (
    CrimeOverviewResponse,
    CaseStatusBreakdown,
    TrendResponse,
    TrendItem,
    CategoryBreakdownResponse,
    CategoryBreakdownItem,
    TypeBreakdownResponse,
    TypeBreakdownItem,
    HourlyDistributionResponse,
    HourlyDistributionItem,
    VictimDemographicsResponse,
    WeaponDistributionResponse,
    WeaponDistributionItem,
    TopDistrictsResponse,
    TopDistrictItem,
)


class CrimeAnalyticsService:
    @staticmethod
    def _get_district_provenance(
        db: Session, district_id: Optional[int]
    ) -> Tuple[Optional[int], Optional[str], bool, Optional[str]]:
        if not district_id:
            return None, None, False, None
        dist = db.query(District).filter(District.id == district_id).first()
        if dist and not dist.is_census_2011 and dist.parent_district_id:
            parent_dist = db.query(District).filter(District.id == dist.parent_district_id).first()
            p_name = parent_dist.district_name if parent_dist else None
            note = (
                f"Historical crime analytics derived from Census 2011 parent jurisdiction '{p_name}' (#{dist.parent_district_id}). "
                f"Direct actual counts for modern carved district '{dist.district_name}' remain unrecorded/NULL."
            )
            return dist.parent_district_id, p_name, True, note
        return None, None, False, None

    @staticmethod
    def get_overview(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        geography_mode: str = "current",
    ) -> CrimeOverviewResponse:
        data = CrimeRepository.get_overview(
            db,
            state_id=state_id,
            district_id=district_id,
            start_date=start_date,
            end_date=end_date,
            geography_mode=geography_mode,
        )
        p_id, p_name, is_derived, note = CrimeAnalyticsService._get_district_provenance(db, district_id)
        return CrimeOverviewResponse(
            total_incidents=data["total_incidents"],
            total_districts=data["total_districts"],
            total_states=data["total_states"],
            total_crime_types=data["total_crime_types"],
            total_crime_categories=data["total_crime_categories"],
            cases=CaseStatusBreakdown(
                closed=data["cases_closed"],
                open=data["cases_open"],
                clearance_rate_pct=data["clearance_rate"],
            ),
            earliest_incident_date=data["earliest_date"],
            latest_incident_date=data["latest_date"],
            filtered_by_state_id=state_id,
            filtered_by_district_id=district_id,
            parent_district_id=p_id,
            parent_district_name=p_name,
            is_derived_from_parent=is_derived,
            notes=note,
            geography_mode=data.get("geography_mode", geography_mode),
            jurisdiction_label=data.get("jurisdiction_label", "Administrative Entities"),
            jurisdiction_value=data.get("jurisdiction_value", "36 States & UTs"),
            jurisdiction_subtext=data.get("jurisdiction_subtext", "797 Modern Administrative Districts"),
        )

    @staticmethod
    def get_trends(
        db: Session,
        interval: str = "month",
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        geography_mode: str = "current",
    ) -> TrendResponse:
        rows = CrimeRepository.get_trends(
            db,
            interval=interval,
            state_id=state_id,
            district_id=district_id,
            start_date=start_date,
            end_date=end_date,
            geography_mode=geography_mode,
        )
        p_id, p_name, is_derived, note = CrimeAnalyticsService._get_district_provenance(db, district_id)
        items = [TrendItem(period=r["period"], incident_count=r["incident_count"]) for r in rows]
        return TrendResponse(
            interval=interval,
            total_points=len(items),
            items=items,
            parent_district_id=p_id,
            parent_district_name=p_name,
            is_derived_from_parent=is_derived,
            notes=note,
        )

    @staticmethod
    def get_categories(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        geography_mode: str = "current",
    ) -> CategoryBreakdownResponse:
        rows = CrimeRepository.get_crimes_by_category(
            db,
            state_id=state_id,
            district_id=district_id,
            start_date=start_date,
            end_date=end_date,
            geography_mode=geography_mode,
        )
        p_id, p_name, is_derived, note = CrimeAnalyticsService._get_district_provenance(db, district_id)
        items = [CategoryBreakdownItem(**r) for r in rows]
        total = sum(i.incident_count for i in items)
        return CategoryBreakdownResponse(
            total_incidents=total,
            items=items,
            parent_district_id=p_id,
            parent_district_name=p_name,
            is_derived_from_parent=is_derived,
            notes=note,
        )

    @staticmethod
    def get_types(
        db: Session,
        category_id: Optional[int] = None,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        geography_mode: str = "current",
    ) -> TypeBreakdownResponse:
        rows = CrimeRepository.get_crimes_by_type(
            db,
            category_id=category_id,
            state_id=state_id,
            district_id=district_id,
            start_date=start_date,
            end_date=end_date,
            geography_mode=geography_mode,
        )
        p_id, p_name, is_derived, note = CrimeAnalyticsService._get_district_provenance(db, district_id)
        items = [TypeBreakdownItem(**r) for r in rows]
        total = sum(i.incident_count for i in items)
        return TypeBreakdownResponse(
            total_incidents=total,
            items=items,
            parent_district_id=p_id,
            parent_district_name=p_name,
            is_derived_from_parent=is_derived,
            notes=note,
        )

    @staticmethod
    def get_hourly(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        geography_mode: str = "current",
    ) -> HourlyDistributionResponse:
        rows = CrimeRepository.get_hourly_distribution(
            db, state_id=state_id, district_id=district_id, geography_mode=geography_mode
        )
        p_id, p_name, is_derived, note = CrimeAnalyticsService._get_district_provenance(db, district_id)
        items = [HourlyDistributionItem(**r) for r in rows]
        peak = max(items, key=lambda x: x.incident_count).hour if items else 0
        return HourlyDistributionResponse(
            peak_hour=peak,
            items=items,
            parent_district_id=p_id,
            parent_district_name=p_name,
            is_derived_from_parent=is_derived,
            notes=note,
        )

    @staticmethod
    def get_victim_demographics(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        geography_mode: str = "current",
    ) -> VictimDemographicsResponse:
        data = CrimeRepository.get_victim_demographics(
            db, state_id=state_id, district_id=district_id, geography_mode=geography_mode
        )
        p_id, p_name, is_derived, note = CrimeAnalyticsService._get_district_provenance(db, district_id)
        return VictimDemographicsResponse(
            gender_distribution=data["gender_distribution"],
            age_distribution=data["age_distribution"],
            average_age=data["average_age"],
            parent_district_id=p_id,
            parent_district_name=p_name,
            is_derived_from_parent=is_derived,
            notes=note,
        )

    @staticmethod
    def get_weapons(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        geography_mode: str = "current",
    ) -> WeaponDistributionResponse:
        rows = CrimeRepository.get_weapon_distribution(
            db, state_id=state_id, district_id=district_id, geography_mode=geography_mode
        )
        p_id, p_name, is_derived, note = CrimeAnalyticsService._get_district_provenance(db, district_id)
        items = [WeaponDistributionItem(**r) for r in rows]
        total = sum(i.incident_count for i in items)
        return WeaponDistributionResponse(
            total_incidents=total,
            items=items,
            parent_district_id=p_id,
            parent_district_name=p_name,
            is_derived_from_parent=is_derived,
            notes=note,
        )

    @staticmethod
    def get_top_districts(
        db: Session,
        metric: str = "volume",
        limit: int = 10,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        geography_mode: str = "current",
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> TopDistrictsResponse:
        p_id, p_name, is_derived, note = CrimeAnalyticsService._get_district_provenance(db, district_id)
        rows = CrimeRepository.get_top_districts(
            db,
            metric=metric,
            limit=limit,
            state_id=state_id,
            district_id=district_id,
            geography_mode=geography_mode,
            start_date=start_date,
            end_date=end_date,
        )
        items = [TopDistrictItem(**r) for r in rows]
        return TopDistrictsResponse(
            metric=metric,
            items=items,
            parent_district_id=p_id,
            parent_district_name=p_name,
            is_derived_from_parent=is_derived,
            notes=note,
        )
