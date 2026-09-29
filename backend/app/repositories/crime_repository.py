from sqlalchemy.orm import Session
from sqlalchemy import func, case, text, desc
from typing import List, Dict, Any, Optional
from datetime import date
from backend.app.models.crime import CrimeIncident, CrimeType, CrimeCategory
from backend.app.models.geography import District, State, DistrictGeographyMapping
from backend.app.models.demographics import DistrictDemographics


class CrimeRepository:
    @staticmethod
    def resolve_filter_district_ids(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
    ) -> Optional[List[int]]:
        """
        Resolves historical Census 2011 district IDs corresponding to filter parameters.
        Ensures dual-layer compatibility:
        - Modern child districts (e.g. current Hyderabad ID 644) resolve to historical parent (ID 9).
        - Modern state filters (e.g. Telangana State ID 36) resolve to historical parent districts (IDs: 4, 9, 10, ...).
        - Modern AP (State ID 2) resolves to the 13 true AP historical districts (excluding Telangana).
        """
        if district_id is not None:
            dist = db.query(District).filter(District.id == district_id).first()
            if dist and dist.parent_district_id and not dist.is_census_2011:
                return [dist.parent_district_id]
            return [district_id]
        elif state_id is not None:
            mapped_ids = (
                db.query(DistrictGeographyMapping.historical_district_id)
                .join(District, DistrictGeographyMapping.current_district_id == District.id)
                .filter(District.state_id == state_id)
                .distinct()
                .all()
            )
            if mapped_ids:
                return [r[0] for r in mapped_ids]
            else:
                dist_ids = (
                    db.query(District.id)
                    .filter(District.state_id == state_id, District.is_census_2011 == True)
                    .all()
                )
                return [r[0] for r in dist_ids]
        return None

    @staticmethod
    def get_overview(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        query = db.query(
            func.count(CrimeIncident.id).label("total_incidents"),
            func.count(func.distinct(CrimeIncident.district_id)).label("total_districts"),
            func.count(func.distinct(CrimeIncident.crime_type_id)).label("total_crime_types"),
            func.sum(case((CrimeIncident.case_status == "CLOSED", 1), else_=0)).label("cases_closed"),
            func.sum(case((CrimeIncident.case_status == "OPEN", 1), else_=0)).label("cases_open"),
            func.min(CrimeIncident.incident_date).label("earliest_date"),
            func.max(CrimeIncident.incident_date).label("latest_date"),
        )

        filter_ids = CrimeRepository.resolve_filter_district_ids(db, state_id=state_id, district_id=district_id)
        if filter_ids is not None:
            query = query.filter(CrimeIncident.district_id.in_(filter_ids))

        if start_date is not None:
            query = query.filter(CrimeIncident.incident_date >= start_date)
        if end_date is not None:
            query = query.filter(CrimeIncident.incident_date <= end_date)

        row = query.one()

        # Total states count
        states_count_query = db.query(func.count(func.distinct(District.state_id))).join(
            CrimeIncident, District.id == CrimeIncident.district_id
        )
        if filter_ids is not None:
            states_count_query = states_count_query.filter(CrimeIncident.district_id.in_(filter_ids))
        if start_date is not None:
            states_count_query = states_count_query.filter(CrimeIncident.incident_date >= start_date)
        if end_date is not None:
            states_count_query = states_count_query.filter(CrimeIncident.incident_date <= end_date)
        total_states = states_count_query.scalar() or 0

        # Total categories count
        categories_count_query = db.query(func.count(func.distinct(CrimeType.category_id))).join(
            CrimeIncident, CrimeType.id == CrimeIncident.crime_type_id
        )
        if filter_ids is not None:
            categories_count_query = categories_count_query.filter(CrimeIncident.district_id.in_(filter_ids))
        if start_date is not None:
            categories_count_query = categories_count_query.filter(CrimeIncident.incident_date >= start_date)
        if end_date is not None:
            categories_count_query = categories_count_query.filter(CrimeIncident.incident_date <= end_date)
        total_categories = categories_count_query.scalar() or 0

        total_incidents = row.total_incidents or 0
        cases_closed = row.cases_closed or 0
        cases_open = row.cases_open or 0
        clearance_rate = round((cases_closed / total_incidents * 100), 2) if total_incidents > 0 else 0.0

        return {
            "total_incidents": total_incidents,
            "total_districts": row.total_districts or 0,
            "total_states": total_states,
            "total_crime_types": row.total_crime_types or 0,
            "total_crime_categories": total_categories,
            "cases_closed": cases_closed,
            "cases_open": cases_open,
            "clearance_rate": clearance_rate,
            "earliest_date": str(row.earliest_date or ""),
            "latest_date": str(row.latest_date or ""),
        }

    @staticmethod
    def get_trends(
        db: Session,
        interval: str = "month",
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        if interval == "year":
            period_expr = func.date_format(CrimeIncident.incident_date, "%Y")
        elif interval == "day":
            period_expr = func.date_format(CrimeIncident.incident_date, "%Y-%m-%d")
        else:  # default month
            period_expr = func.date_format(CrimeIncident.incident_date, "%Y-%m")

        query = db.query(
            period_expr.label("period"),
            func.count(CrimeIncident.id).label("incident_count"),
        )

        filter_ids = CrimeRepository.resolve_filter_district_ids(db, state_id=state_id, district_id=district_id)
        if filter_ids is not None:
            query = query.filter(CrimeIncident.district_id.in_(filter_ids))

        if start_date is not None:
            query = query.filter(CrimeIncident.incident_date >= start_date)
        if end_date is not None:
            query = query.filter(CrimeIncident.incident_date <= end_date)

        rows = query.group_by(period_expr).order_by(period_expr.asc()).all()
        return [{"period": r.period, "incident_count": r.incident_count} for r in rows]

    @staticmethod
    def get_crimes_by_category(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        query = (
            db.query(
                CrimeCategory.id.label("category_id"),
                CrimeCategory.category_name,
                CrimeCategory.severity_weight,
                func.count(CrimeIncident.id).label("incident_count"),
            )
            .join(CrimeType, CrimeCategory.id == CrimeType.category_id)
            .join(CrimeIncident, CrimeType.id == CrimeIncident.crime_type_id)
        )

        filter_ids = CrimeRepository.resolve_filter_district_ids(db, state_id=state_id, district_id=district_id)
        if filter_ids is not None:
            query = query.filter(CrimeIncident.district_id.in_(filter_ids))

        if start_date is not None:
            query = query.filter(CrimeIncident.incident_date >= start_date)
        if end_date is not None:
            query = query.filter(CrimeIncident.incident_date <= end_date)

        rows = (
            query.group_by(CrimeCategory.id, CrimeCategory.category_name, CrimeCategory.severity_weight)
            .order_by(desc("incident_count"))
            .all()
        )
        total = sum(r.incident_count for r in rows) or 1
        return [
            {
                "category_id": r.category_id,
                "category_name": r.category_name,
                "severity_weight": float(r.severity_weight),
                "incident_count": r.incident_count,
                "percentage": round(r.incident_count / total * 100, 2),
            }
            for r in rows
        ]

    @staticmethod
    def get_crimes_by_type(
        db: Session,
        category_id: Optional[int] = None,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        query = (
            db.query(
                CrimeType.id.label("crime_type_id"),
                CrimeType.crime_code,
                CrimeType.crime_name,
                CrimeCategory.category_name,
                CrimeType.severity_level,
                func.count(CrimeIncident.id).label("incident_count"),
            )
            .join(CrimeCategory, CrimeType.category_id == CrimeCategory.id)
            .join(CrimeIncident, CrimeType.id == CrimeIncident.crime_type_id)
        )

        if category_id is not None:
            query = query.filter(CrimeType.category_id == category_id)

        filter_ids = CrimeRepository.resolve_filter_district_ids(db, state_id=state_id, district_id=district_id)
        if filter_ids is not None:
            query = query.filter(CrimeIncident.district_id.in_(filter_ids))

        if start_date is not None:
            query = query.filter(CrimeIncident.incident_date >= start_date)
        if end_date is not None:
            query = query.filter(CrimeIncident.incident_date <= end_date)

        rows = (
            query.group_by(
                CrimeType.id,
                CrimeType.crime_code,
                CrimeType.crime_name,
                CrimeCategory.category_name,
                CrimeType.severity_level,
            )
            .order_by(desc("incident_count"))
            .all()
        )
        total = sum(r.incident_count for r in rows) or 1
        return [
            {
                "crime_type_id": r.crime_type_id,
                "crime_code": r.crime_code,
                "crime_name": r.crime_name,
                "category_name": r.category_name,
                "severity_level": r.severity_level,
                "incident_count": r.incident_count,
                "percentage": round(r.incident_count / total * 100, 2),
            }
            for r in rows
        ]

    @staticmethod
    def get_hourly_distribution(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        hour_expr = func.hour(CrimeIncident.incident_time)
        query = db.query(
            hour_expr.label("hour"),
            func.count(CrimeIncident.id).label("incident_count"),
        )

        filter_ids = CrimeRepository.resolve_filter_district_ids(db, state_id=state_id, district_id=district_id)
        if filter_ids is not None:
            query = query.filter(CrimeIncident.district_id.in_(filter_ids))

        rows = query.group_by(hour_expr).order_by(hour_expr.asc()).all()
        total = sum(r.incident_count for r in rows) or 1
        return [
            {
                "hour": r.hour,
                "incident_count": r.incident_count,
                "percentage": round(r.incident_count / total * 100, 2),
            }
            for r in rows
        ]

    @staticmethod
    def get_victim_demographics(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        query = db.query(
            CrimeIncident.victim_gender,
            CrimeIncident.victim_age,
            func.count(CrimeIncident.id).label("count"),
        )

        filter_ids = CrimeRepository.resolve_filter_district_ids(db, state_id=state_id, district_id=district_id)
        if filter_ids is not None:
            query = query.filter(CrimeIncident.district_id.in_(filter_ids))

        rows = query.group_by(CrimeIncident.victim_gender, CrimeIncident.victim_age).all()

        gender_counts: Dict[str, int] = {}
        age_groups = {"0-18": 0, "19-35": 0, "36-50": 0, "51-65": 0, "65+": 0}
        total_age = 0
        age_count = 0

        for r in rows:
            g = r.victim_gender or "UNKNOWN"
            cnt = r.count
            gender_counts[g] = gender_counts.get(g, 0) + cnt

            age = r.victim_age
            if age is not None:
                total_age += age * cnt
                age_count += cnt
                if age <= 18:
                    age_groups["0-18"] += cnt
                elif age <= 35:
                    age_groups["19-35"] += cnt
                elif age <= 50:
                    age_groups["36-50"] += cnt
                elif age <= 65:
                    age_groups["51-65"] += cnt
                else:
                    age_groups["65+"] += cnt

        avg_age = round(total_age / age_count, 1) if age_count > 0 else 0.0

        return {
            "average_age": avg_age,
            "gender_distribution": gender_counts,
            "age_distribution": age_groups,
        }

    @staticmethod
    def get_weapon_distribution(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        wp_expr = func.coalesce(func.nullif(CrimeIncident.weapon_used, ""), "UNKNOWN")
        query = db.query(
            wp_expr.label("weapon_name"),
            func.count(CrimeIncident.id).label("incident_count"),
        )

        filter_ids = CrimeRepository.resolve_filter_district_ids(db, state_id=state_id, district_id=district_id)
        if filter_ids is not None:
            query = query.filter(CrimeIncident.district_id.in_(filter_ids))

        rows = query.group_by(wp_expr).order_by(desc("incident_count")).all()
        total = sum(r.incident_count for r in rows) or 1
        return [
            {
                "weapon_name": r.weapon_name,
                "incident_count": r.incident_count,
                "percentage": round(r.incident_count / total * 100, 2),
            }
            for r in rows
        ]

    @staticmethod
    def get_top_districts(
        db: Session,
        metric: str = "volume",
        limit: int = 10,
        state_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        query = (
            db.query(
                District.id.label("district_id"),
                District.district_name,
                State.state_name,
                func.count(CrimeIncident.id).label("incident_count"),
                DistrictDemographics.total_population,
            )
            .join(State, District.state_id == State.id)
            .join(CrimeIncident, District.id == CrimeIncident.district_id)
            .outerjoin(DistrictDemographics, District.id == DistrictDemographics.district_id)
        )

        filter_ids = CrimeRepository.resolve_filter_district_ids(db, state_id=state_id, district_id=None)
        if filter_ids is not None:
            query = query.filter(District.id.in_(filter_ids))
        else:
            query = query.filter(District.is_census_2011 == True)

        query = query.group_by(
            District.id,
            District.district_name,
            State.state_name,
            DistrictDemographics.total_population,
        )

        if metric == "rate":
            # Per 100k population
            rate_expr = (func.count(CrimeIncident.id) * 100000.0) / func.nullif(DistrictDemographics.total_population, 0)
            query = query.order_by(desc(rate_expr))
        else:
            query = query.order_by(desc("incident_count"))

        rows = query.limit(limit).all()
        result = []
        for r in rows:
            pop = r.total_population
            rate = round((r.incident_count * 100000.0 / pop), 2) if pop and pop > 0 else None
            result.append({
                "district_id": r.district_id,
                "district_name": r.district_name,
                "state_name": r.state_name,
                "incident_count": r.incident_count,
                "total_population": pop,
                "crime_rate_per_100k": rate,
            })
        return result
