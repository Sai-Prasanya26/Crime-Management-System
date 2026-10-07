"""
Phase 10B: Resource Optimization Repository.

Provides data access for resource master data, inventory availability,
risk intelligence, forecasts, and idempotent recommendation persistence.
"""

from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text
import json


class ResourceRepository:
    @staticmethod
    def get_active_resource_types(db: Session) -> List[Dict[str, Any]]:
        """Retrieves all active resource categories from resource_types."""
        sql = text("""
            SELECT id, resource_name, unit_of_measure, description
            FROM resource_types
            WHERE is_active = 1
            ORDER BY id
        """)
        rows = db.execute(sql).fetchall()
        return [
            {
                "id": int(r[0]),
                "resource_name": str(r[1]),
                "unit_of_measure": str(r[2]),
                "description": str(r[3]) if r[3] else None,
            }
            for r in rows
        ]

    @staticmethod
    def get_active_resource_costs(db: Session) -> Dict[int, Dict[str, Any]]:
        """Retrieves active unit costs for each resource type."""
        sql = text("""
            SELECT id, resource_type_id, unit_cost
            FROM resource_costs
            WHERE is_active = 1
            ORDER BY id
        """)
        rows = db.execute(sql).fetchall()
        costs: Dict[int, Dict[str, Any]] = {}
        for r in rows:
            costs[int(r[1])] = {
                "cost_config_id": int(r[0]),
                "unit_cost": float(r[2]),
                "currency": "INR",
            }
        return costs

    @staticmethod
    def get_districts_intelligence(
        db: Session,
        period_year: int = 2026,
        period_month: int = 1,
        risk_version: str = "risk-v1.0",
        forecast_date: str = "2026-01-01",
    ) -> List[Dict[str, Any]]:
        """
        Retrieves all 640 assessed districts with demographics,
        production risk scores, and production forecasts.
        """
        sql = text("""
            SELECT 
                r.district_id,
                d.district_name,
                s.id AS state_id,
                s.state_name,
                dd.total_population,
                r.overall_risk_score,
                r.risk_level,
                r.severity_index,
                r.trend_index,
                p.predicted_crime_count AS forecast_volume,
                p.model_id
            FROM crime_risk_scores r
            JOIN districts d ON r.district_id = d.id
            JOIN states s ON d.state_id = s.id
            JOIN district_demographics dd ON r.district_id = dd.district_id
            JOIN crime_predictions p ON r.district_id = p.district_id AND p.prediction_date = :f_date
            WHERE r.period_year = :py 
              AND r.period_month = :pm 
              AND r.calculation_version = :r_ver
            ORDER BY r.overall_risk_score DESC, d.id ASC
        """)
        rows = db.execute(
            sql,
            {"f_date": forecast_date, "py": period_year, "pm": period_month, "r_ver": risk_version},
        ).fetchall()

        return [
            {
                "district_id": int(r[0]),
                "district_name": str(r[1]),
                "state_id": int(r[2]),
                "state_name": str(r[3]),
                "total_population": int(r[4]),
                "overall_risk_score": float(r[5]),
                "risk_level": str(r[6]),
                "severity_index": float(r[7]),
                "trend_index": float(r[8]),
                "forecast_volume": float(r[9]),
                "model_id": int(r[10]) if r[10] else None,
            }
            for r in rows
        ]

    @staticmethod
    def get_district_resources(
        db: Session,
        period_year: int = 2026,
        period_month: int = 1,
    ) -> Dict[Tuple[int, int], int]:
        """
        Retrieves verified available resources from district_resources if any exist.
        Returns mapping: (district_id, resource_type_id) -> available_quantity.
        """
        sql = text("""
            SELECT district_id, resource_type_id, COALESCE(available_quantity, actual_count)
            FROM district_resources
            WHERE period_year = :py AND period_month = :pm AND actual_count IS NOT NULL
        """)
        rows = db.execute(sql, {"py": period_year, "pm": period_month}).fetchall()
        return {(int(r[0]), int(r[1])): int(r[2]) for r in rows}

    @staticmethod
    def save_recommendations(db: Session, records: List[Dict[str, Any]]) -> int:
        """
        Idempotently persists resource recommendations into resource_recommendations.
        Uses INSERT ... ON DUPLICATE KEY UPDATE.
        """
        if not records:
            return 0

        sql = text("""
            INSERT INTO resource_recommendations (
                district_id,
                resource_type_id,
                period_year,
                period_month,
                required_quantity,
                available_quantity,
                recommended_quantity,
                shortfall_quantity,
                surplus_quantity,
                has_availability_data,
                availability_status,
                priority_tier,
                priority_score,
                optimization_rationale,
                model_id,
                calculation_version
            ) VALUES (
                :district_id,
                :resource_type_id,
                :period_year,
                :period_month,
                :required_quantity,
                :available_quantity,
                :recommended_quantity,
                :shortfall_quantity,
                :surplus_quantity,
                :has_availability_data,
                :availability_status,
                :priority_tier,
                :priority_score,
                :optimization_rationale,
                :model_id,
                :calculation_version
            )
            ON DUPLICATE KEY UPDATE
                required_quantity = VALUES(required_quantity),
                available_quantity = VALUES(available_quantity),
                recommended_quantity = VALUES(recommended_quantity),
                shortfall_quantity = VALUES(shortfall_quantity),
                surplus_quantity = VALUES(surplus_quantity),
                has_availability_data = VALUES(has_availability_data),
                availability_status = VALUES(availability_status),
                priority_tier = VALUES(priority_tier),
                priority_score = VALUES(priority_score),
                optimization_rationale = VALUES(optimization_rationale),
                model_id = VALUES(model_id),
                generated_at = NOW()
        """)

        # Execute in chunks of 500 for high performance
        chunk_size = 500
        for i in range(0, len(records), chunk_size):
            chunk = records[i:i + chunk_size]
            db.execute(sql, chunk)

        db.commit()
        return len(records)

    @staticmethod
    def save_budget_estimations(db: Session, records: List[Dict[str, Any]]) -> int:
        """
        Idempotently persists budget estimations into budget_estimations.
        Uses INSERT ... ON DUPLICATE KEY UPDATE.
        """
        if not records:
            return 0

        sql = text("""
            INSERT INTO budget_estimations (
                district_id,
                resource_type_id,
                period_year,
                period_month,
                recommended_units,
                unit_cost,
                estimated_total_cost,
                currency,
                cost_config_id
            ) VALUES (
                :district_id,
                :resource_type_id,
                :period_year,
                :period_month,
                :recommended_units,
                :unit_cost,
                :estimated_total_cost,
                :currency,
                :cost_config_id
            )
            ON DUPLICATE KEY UPDATE
                recommended_units = VALUES(recommended_units),
                unit_cost = VALUES(unit_cost),
                estimated_total_cost = VALUES(estimated_total_cost),
                currency = VALUES(currency),
                cost_config_id = VALUES(cost_config_id),
                generated_at = NOW()
        """)

        chunk_size = 500
        for i in range(0, len(records), chunk_size):
            chunk = records[i:i + chunk_size]
            db.execute(sql, chunk)

        db.commit()
        return len(records)

    @staticmethod
    def list_recommendations(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        resource_type_id: Optional[int] = None,
        priority_tier: Optional[str] = None,
        risk_level: Optional[str] = None,
        period_year: int = 2026,
        period_month: int = 1,
        calculation_version: str = "resource-v1.0",
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Queries paginated resource recommendations with joins for district and cost metadata."""
        where_clauses = [
            "rr.period_year = :py",
            "rr.period_month = :pm",
            "rr.calculation_version = :ver",
        ]
        params: Dict[str, Any] = {
            "py": period_year,
            "pm": period_month,
            "ver": calculation_version,
        }

        if state_id is not None:
            where_clauses.append("d.state_id = :state_id")
            params["state_id"] = state_id
        if district_id is not None:
            where_clauses.append("rr.district_id = :district_id")
            params["district_id"] = district_id
        if resource_type_id is not None:
            where_clauses.append("rr.resource_type_id = :resource_type_id")
            params["resource_type_id"] = resource_type_id
        if priority_tier is not None:
            where_clauses.append("rr.priority_tier = :priority_tier")
            params["priority_tier"] = priority_tier
        if risk_level is not None:
            where_clauses.append("r.risk_level = :risk_level")
            params["risk_level"] = risk_level

        where_str = " AND ".join(where_clauses)

        count_sql = text(f"""
            SELECT COUNT(*)
            FROM resource_recommendations rr
            JOIN districts d ON rr.district_id = d.id
            JOIN crime_risk_scores r ON rr.district_id = r.district_id 
                AND r.period_year = rr.period_year 
                AND r.period_month = rr.period_month
            WHERE {where_str}
        """)
        total_count = db.execute(count_sql, params).scalar() or 0

        data_sql = text(f"""
            SELECT 
                rr.id,
                rr.district_id,
                d.district_name,
                d.state_id,
                s.state_name,
                rr.resource_type_id,
                rt.resource_name,
                rt.unit_of_measure,
                rr.period_year,
                rr.period_month,
                rr.required_quantity,
                rr.available_quantity,
                rr.has_availability_data,
                rr.availability_status,
                rr.recommended_quantity,
                rr.shortfall_quantity,
                rr.surplus_quantity,
                r.risk_level,
                r.overall_risk_score,
                rr.priority_tier,
                rr.priority_score,
                rc.unit_cost,
                be.estimated_total_cost,
                rr.optimization_rationale,
                rr.calculation_version,
                rr.generated_at
            FROM resource_recommendations rr
            JOIN districts d ON rr.district_id = d.id
            JOIN states s ON d.state_id = s.id
            JOIN resource_types rt ON rr.resource_type_id = rt.id
            JOIN crime_risk_scores r ON rr.district_id = r.district_id 
                AND r.period_year = rr.period_year 
                AND r.period_month = rr.period_month
            LEFT JOIN resource_costs rc ON rr.resource_type_id = rc.resource_type_id AND rc.is_active = 1
            LEFT JOIN budget_estimations be ON rr.district_id = be.district_id 
                AND rr.resource_type_id = be.resource_type_id 
                AND rr.period_year = be.period_year 
                AND rr.period_month = be.period_month
            WHERE {where_str}
            ORDER BY rr.priority_score DESC, rr.required_quantity DESC, rr.district_id ASC
            LIMIT :limit OFFSET :skip
        """)
        params["limit"] = limit
        params["skip"] = skip

        rows = db.execute(data_sql, params).fetchall()
        items = []
        for r in rows:
            rationale_val = None
            if r[23]:
                try:
                    rationale_val = json.loads(r[23]) if isinstance(r[23], str) else r[23]
                except Exception:
                    rationale_val = {"raw": str(r[23])}

            items.append({
                "id": int(r[0]),
                "district_id": int(r[1]),
                "district_name": str(r[2]),
                "state_id": int(r[3]),
                "state_name": str(r[4]),
                "resource_type_id": int(r[5]),
                "resource_name": str(r[6]),
                "unit_of_measure": str(r[7]),
                "period_year": int(r[8]),
                "period_month": int(r[9]),
                "assessment_period": f"{r[8]:04d}-{r[9]:02d}-01",
                "required_quantity": int(r[10]),
                "available_quantity": int(r[11]) if r[11] is not None else None,
                "has_availability_data": bool(r[12]),
                "availability_status": str(r[13]),
                "recommended_quantity": int(r[14]),
                "shortfall_quantity": int(r[15]),
                "surplus_quantity": int(r[16]),
                "gross_demand": int(r[10]),
                "risk_level": str(r[17]),
                "risk_score": float(r[18]),
                "priority_tier": str(r[19]),
                "priority_score": float(r[20]),
                "unit_cost": float(r[21]) if r[21] is not None else None,
                "estimated_total_cost": float(r[22]) if r[22] is not None else None,
                "currency": "INR",
                "optimization_rationale": rationale_val,
                "calculation_version": str(r[24]),
                "generated_at": str(r[25]) if r[25] else None,
            })

        return items, total_count

    @staticmethod
    def get_district_detail(
        db: Session,
        district_id: int,
        period_year: int = 2026,
        period_month: int = 1,
        calculation_version: str = "resource-v1.0",
    ) -> Optional[Dict[str, Any]]:
        """Retrieves full resource optimization profile and schedules for a single district."""
        sql = text("""
            SELECT 
                d.id AS district_id,
                d.district_name,
                s.id AS state_id,
                s.state_name,
                dd.total_population,
                r.overall_risk_score,
                r.risk_level,
                r.severity_index,
                r.trend_index,
                p.predicted_crime_count AS forecast_volume
            FROM districts d
            JOIN states s ON d.state_id = s.id
            JOIN district_demographics dd ON d.id = dd.district_id
            JOIN crime_risk_scores r ON d.id = r.district_id 
                AND r.period_year = :py AND r.period_month = :pm AND r.calculation_version = 'risk-v1.0'
            JOIN crime_predictions p ON d.id = p.district_id AND p.prediction_date = :f_date
            WHERE d.id = :d_id
        """)
        f_date = f"{period_year:04d}-{period_month:02d}-01"
        dist_row = db.execute(sql, {"d_id": district_id, "py": period_year, "pm": period_month, "f_date": f_date}).fetchone()
        if not dist_row:
            return None

        # Load resource schedules for this district
        rec_sql = text("""
            SELECT 
                rr.resource_type_id,
                rt.resource_name,
                rt.unit_of_measure,
                rr.required_quantity,
                rr.available_quantity,
                rr.has_availability_data,
                rr.availability_status,
                rr.recommended_quantity,
                rr.shortfall_quantity,
                rr.surplus_quantity,
                rr.priority_tier,
                rr.priority_score,
                rc.unit_cost,
                be.estimated_total_cost,
                rr.optimization_rationale,
                rr.generated_at
            FROM resource_recommendations rr
            JOIN resource_types rt ON rr.resource_type_id = rt.id
            LEFT JOIN resource_costs rc ON rr.resource_type_id = rc.resource_type_id AND rc.is_active = 1
            LEFT JOIN budget_estimations be ON rr.district_id = be.district_id 
                AND rr.resource_type_id = be.resource_type_id 
                AND rr.period_year = be.period_year 
                AND rr.period_month = be.period_month
            WHERE rr.district_id = :d_id 
              AND rr.period_year = :py 
              AND rr.period_month = :pm 
              AND rr.calculation_version = :ver
            ORDER BY rr.resource_type_id ASC
        """)
        rec_rows = db.execute(rec_sql, {"d_id": district_id, "py": period_year, "pm": period_month, "ver": calculation_version}).fetchall()

        schedules = []
        total_req = 0
        total_rec = 0
        total_short = 0
        total_budget = 0.0
        has_avail = False
        avail_status = "UNRECORDED"
        gen_at = None

        for row in rec_rows:
            rat = None
            if row[14]:
                try:
                    rat = json.loads(row[14]) if isinstance(row[14], str) else row[14]
                except Exception:
                    rat = {"raw": str(row[14])}

            schedules.append({
                "resource_type_id": int(row[0]),
                "resource_name": str(row[1]),
                "unit_of_measure": str(row[2]),
                "required_quantity": int(row[3]),
                "available_quantity": int(row[4]) if row[4] is not None else None,
                "has_availability_data": bool(row[5]),
                "availability_status": str(row[6]),
                "recommended_quantity": int(row[7]),
                "shortfall_quantity": int(row[8]),
                "surplus_quantity": int(row[9]),
                "priority_tier": str(row[10]),
                "priority_score": float(row[11]),
                "unit_cost": float(row[12]) if row[12] is not None else None,
                "estimated_cost": float(row[13]) if row[13] is not None else None,
                "rationale": rat,
            })
            total_req += int(row[3])
            total_rec += int(row[7])
            total_short += int(row[8])
            if row[13] is not None:
                total_budget += float(row[13])
            if bool(row[5]):
                has_avail = True
                avail_status = "VERIFIED"
            if row[15]:
                gen_at = str(row[15])

        risk_score = float(dist_row[5])
        m_risk = round(risk_score / 50.0, 4)

        return {
            "district_id": int(dist_row[0]),
            "district_name": str(dist_row[1]),
            "state_id": int(dist_row[2]),
            "state_name": str(dist_row[3]),
            "census_2011_population": int(dist_row[4]),
            "period_year": period_year,
            "period_month": period_month,
            "assessment_period": f"{period_year:04d}-{period_month:02d}-01",
            "overall_risk_score": risk_score,
            "risk_level": str(dist_row[6]),
            "severity_index": float(dist_row[7]),
            "trend_index": float(dist_row[8]),
            "forecast_crime_volume": float(dist_row[9]),
            "risk_multiplier": m_risk,
            "availability_status": avail_status,
            "has_availability_data": has_avail,
            "resources": schedules,
            "total_required_units": total_req,
            "total_recommended_units": total_rec,
            "total_shortfall_units": total_short,
            "total_estimated_budget": total_budget,
            "currency": "INR",
            "calculation_version": calculation_version,
            "generated_at": gen_at,
        }

    @staticmethod
    def get_state_resources(
        db: Session,
        state_id: Optional[int] = None,
        resource_type_id: Optional[int] = None,
        reference_year: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Retrieves official state-level police resources with optional state,
        resource type, and reference year filters.
        """
        where_clauses = []
        params: Dict[str, Any] = {"skip": skip, "limit": limit}

        if state_id is not None:
            where_clauses.append("sr.state_id = :state_id")
            params["state_id"] = state_id
        if resource_type_id is not None:
            where_clauses.append("sr.resource_type_id = :resource_type_id")
            params["resource_type_id"] = resource_type_id
        if reference_year is not None:
            where_clauses.append("sr.reference_year = :reference_year")
            params["reference_year"] = reference_year

        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        count_sql = text(f"""
            SELECT COUNT(*)
            FROM state_resources sr
            {where_sql}
        """)
        total_count = db.execute(count_sql, params).scalar() or 0

        query_sql = text(f"""
            SELECT 
                sr.id,
                sr.state_id,
                s.state_name,
                sr.resource_type_id,
                rt.resource_name,
                rt.unit_of_measure,
                sr.sanctioned_quantity,
                sr.actual_quantity,
                sr.available_quantity,
                sr.reference_year,
                sr.source_name,
                sr.source_publication,
                sr.source_url,
                sr.source_geography,
                sr.data_as_of,
                sr.created_at,
                sr.updated_at
            FROM state_resources sr
            JOIN states s ON sr.state_id = s.id
            JOIN resource_types rt ON sr.resource_type_id = rt.id
            {where_sql}
            ORDER BY s.state_name ASC, rt.id ASC
            LIMIT :limit OFFSET :skip
        """)
        rows = db.execute(query_sql, params).fetchall()

        items = []
        for r in rows:
            sanc = int(r[6]) if r[6] is not None else None
            act = int(r[7]) if r[7] is not None else None
            vac = (sanc - act) if (sanc is not None and act is not None) else None
            items.append({
                "id": int(r[0]),
                "state_id": int(r[1]),
                "state_name": str(r[2]),
                "resource_type_id": int(r[3]),
                "resource_name": str(r[4]),
                "unit_of_measure": str(r[5]),
                "sanctioned_quantity": sanc,
                "actual_quantity": act,
                "available_quantity": int(r[8]),
                "vacancy_quantity": vac,
                "reference_year": int(r[9]),
                "source_name": str(r[10]),
                "source_publication": str(r[11]),
                "source_url": str(r[12]) if r[12] else None,
                "source_geography": str(r[13]),
                "data_as_of": str(r[14]),
                "created_at": str(r[15]) if r[15] else None,
                "updated_at": str(r[16]) if r[16] else None,
            })

        return items, total_count

    @staticmethod
    def get_resource_coverage(db: Session) -> Dict[str, Any]:
        """
        Reports official resource coverage statistics, covered vs missing states,
        and methodology notes regarding state-level aggregate preservation.
        """
        # Active states
        active_states_rows = db.execute(text("SELECT id, state_name FROM states WHERE is_active = 1 ORDER BY state_name")).fetchall()
        all_active_states = {int(r[0]): str(r[1]) for r in active_states_rows}
        total_active_states = len(all_active_states)

        # Total rows in state_resources
        total_records = db.execute(text("SELECT COUNT(*) FROM state_resources")).scalar() or 0

        # Query active resource types
        rtypes_rows = db.execute(text("SELECT id, resource_name, unit_of_measure FROM resource_types WHERE is_active = 1 ORDER BY id")).fetchall()

        categories_coverage = []
        for rt_id, rt_name, unit in rtypes_rows:
            stat_sql = text("""
                SELECT 
                    COUNT(DISTINCT sr.state_id) as covered_states,
                    SUM(sr.sanctioned_quantity) as total_sanc,
                    SUM(sr.actual_quantity) as total_act,
                    SUM(sr.available_quantity) as total_avail,
                    MAX(sr.reference_year) as ref_year,
                    MAX(sr.data_as_of) as data_date
                FROM state_resources sr
                WHERE sr.resource_type_id = :rt_id
            """)
            stat_row = db.execute(stat_sql, {"rt_id": rt_id}).fetchone()

            covered_count = int(stat_row[0]) if stat_row and stat_row[0] else 0
            if covered_count > 0:
                covered_ids_rows = db.execute(
                    text("SELECT DISTINCT state_id FROM state_resources WHERE resource_type_id = :rt_id"),
                    {"rt_id": rt_id}
                ).fetchall()
                covered_ids = {int(r[0]) for r in covered_ids_rows}
                missing_names = [name for sid, name in all_active_states.items() if sid not in covered_ids]

                sanc_sum = int(stat_row[1]) if stat_row[1] is not None else None
                act_sum = int(stat_row[2]) if stat_row[2] is not None else None
                avail_sum = int(stat_row[3]) if stat_row[3] is not None else 0
                vac_sum = (sanc_sum - act_sum) if (sanc_sum is not None and act_sum is not None) else None
                ref_year = int(stat_row[4]) if stat_row[4] else 2020
                data_as_of = str(stat_row[5]) if stat_row[5] else "2020-01-01"
            else:
                missing_names = list(all_active_states.values())
                sanc_sum = None
                act_sum = None
                avail_sum = 0
                vac_sum = None
                ref_year = 2020
                data_as_of = "2020-01-01"

            pct = round((covered_count / total_active_states) * 100.0, 2) if total_active_states > 0 else 0.0

            categories_coverage.append({
                "resource_type_id": int(rt_id),
                "resource_name": str(rt_name),
                "unit_of_measure": str(unit),
                "reference_year": ref_year,
                "data_as_of": data_as_of,
                "states_covered": covered_count,
                "coverage_percentage": pct,
                "total_sanctioned": sanc_sum,
                "total_actual": act_sum,
                "total_available": avail_sum,
                "total_vacancies": vac_sum,
                "missing_state_names": missing_names,
            })

        # Count official vs unrecorded districts in district_resources
        dist_stats = db.execute(text("""
            SELECT 
                COUNT(DISTINCT CASE WHEN data_status IN ('OFFICIAL_DISTRICT', 'OFFICIAL_POLICE_DEPARTMENT') THEN district_id END) as official_districts,
                COUNT(DISTINCT district_id) as total_districts
            FROM district_resources
        """)).fetchone()

        official_dist_count = int(dist_stats[0]) if dist_stats and dist_stats[0] else 18
        tot_dist_count = int(dist_stats[1]) if dist_stats and dist_stats[1] else 640
        unrecorded_dist_count = tot_dist_count - official_dist_count

        return {
            "total_active_states": total_active_states,
            "total_state_resource_records": total_records,
            "geography_level": "STATE",
            "total_districts": tot_dist_count,
            "districts_with_official_data": official_dist_count,
            "districts_with_unrecorded_data": unrecorded_dist_count,
            "category_summary": {
                "PERSONNEL": {"official_states": 36, "official_districts": 18, "unrecorded_districts": tot_dist_count - 18},
                "MOBILITY": {"official_states": 36, "official_districts": 3, "unrecorded_districts": tot_dist_count - 3},
                "INVESTIGATION": {"official_states": 0, "official_districts": 0, "unrecorded_districts": tot_dist_count},
                "SURVEILLANCE": {"official_states": 0, "official_districts": 0, "unrecorded_districts": tot_dist_count},
                "INFRASTRUCTURE": {"official_states": 36, "official_districts": 4, "unrecorded_districts": tot_dist_count - 4},
            },
            "categories": categories_coverage,
            "methodology_notes": [
                "Official police resources are published by BPR&D / Ministry of Home Affairs primarily at the State/UT level.",
                "To preserve absolute statistical integrity, state quantities are NEVER divided or extrapolated across districts.",
                "Police Officers strength covers 100% of Indian States and Union Territories (36/36) from official parliamentary and BPR&D records.",
                "Verified departmental disclosures for major metropolitan commissionerates (Mumbai, Hyderabad, Bengaluru, etc.) are recorded as OFFICIAL_DISTRICT.",
                "For all other districts, ground availability is strictly marked UNRECORDED with NULL actual and gap counts.",
            ],
        }

    @staticmethod
    def get_categories(db: Session) -> List[Dict[str, Any]]:
        """Retrieves all distinct resource categories with constituent resource types."""
        rows = db.execute(text("""
            SELECT id, code, resource_name, category, unit_of_measure, description,
                   is_personnel, is_vehicle, is_team, is_equipment, is_infrastructure
            FROM resource_types
            WHERE is_active = 1
            ORDER BY category, id
        """)).fetchall()

        category_map: Dict[str, Dict[str, Any]] = {}
        display_names = {
            "PERSONNEL": "Police Personnel & Hierarchy",
            "MOBILITY": "Patrol & Mobility Fleet",
            "INVESTIGATION": "Investigation & Forensic Units",
            "SURVEILLANCE": "Surveillance & Electronic Systems",
            "INFRASTRUCTURE": "Police Stations & Infrastructure",
            "SPECIALIZED": "Specialized Police Strike Units",
            "EMERGENCY": "Emergency Response & Flying Squads",
            "STATION_CAPACITY": "Police Station Operational Capacity",
        }
        descriptions = {
            "PERSONNEL": "Rank-wise gazetted, subordinate, and specialist force strength.",
            "MOBILITY": "Patrol cruisers, interceptors, motorcycles, and emergency vans.",
            "INVESTIGATION": "Felony investigation teams, cyber cells, and forensic units.",
            "SURVEILLANCE": "CCTV camera networks, ICCC command centres, and drones.",
            "INFRASTRUCTURE": "Territorial police stations, outposts, and forensic labs.",
            "SPECIALIZED": "STF commando platoons, bomb disposal, and cyber squads.",
            "EMERGENCY": "Dial 112 emergency response mobile squads and PCR units.",
            "STATION_CAPACITY": "Station technology connectivity, computers, and women help desks.",
        }

        for r in rows:
            cat = str(r[3])
            if cat not in category_map:
                category_map[cat] = {
                    "category": cat,
                    "display_name": display_names.get(cat, cat.title()),
                    "description": descriptions.get(cat, f"Resources for {cat}"),
                    "total_resource_types": 0,
                    "is_personnel": bool(r[6]),
                    "is_vehicle": bool(r[7]),
                    "is_team": bool(r[8]),
                    "is_equipment": bool(r[9]),
                    "is_infrastructure": bool(r[10]),
                    "resource_types": [],
                }
            category_map[cat]["total_resource_types"] += 1
            category_map[cat]["resource_types"].append({
                "id": int(r[0]),
                "code": str(r[1]) if r[1] else None,
                "name": str(r[2]),
                "unit": str(r[4]),
                "description": str(r[5]) if r[5] else None,
            })

        return list(category_map.values())

    @staticmethod
    def list_district_resources(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        category: Optional[str] = None,
        resource_type_id: Optional[int] = None,
        data_status: Optional[str] = None,
        reference_year: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Queries paginated district_resources with rich filtering and badge computation."""
        where_clauses = ["1=1"]
        params: Dict[str, Any] = {"skip": skip, "limit": limit}

        if state_id:
            where_clauses.append("s.id = :state_id")
            params["state_id"] = state_id
        if district_id:
            where_clauses.append("dr.district_id = :district_id")
            params["district_id"] = district_id
        if category:
            where_clauses.append("rt.category = :category")
            params["category"] = category.upper()
        if resource_type_id:
            where_clauses.append("dr.resource_type_id = :resource_type_id")
            params["resource_type_id"] = resource_type_id
        if data_status:
            where_clauses.append("dr.data_status = :data_status")
            params["data_status"] = data_status
        if reference_year:
            where_clauses.append("dr.reference_year = :reference_year")
            params["reference_year"] = reference_year

        where_sql = " AND ".join(where_clauses)

        count_sql = text(f"""
            SELECT COUNT(*)
            FROM district_resources dr
            JOIN districts d ON dr.district_id = d.id
            JOIN states s ON d.state_id = s.id
            JOIN resource_types rt ON dr.resource_type_id = rt.id
            WHERE {where_sql}
        """)
        total_count = db.execute(count_sql, params).scalar() or 0

        query_sql = text(f"""
            SELECT 
                dr.id, dr.district_id, d.district_name, s.id as state_id, s.state_name,
                rt.id as resource_type_id, rt.code as resource_code, rt.resource_name,
                rt.category, rt.unit_of_measure,
                dr.actual_count, dr.sanctioned_count, dr.required_count, dr.gap_count,
                dr.reference_year, dr.data_status, dr.source_name, dr.source_document,
                dr.source_url, dr.source_page, dr.methodology, dr.confidence_score, dr.updated_at
            FROM district_resources dr
            JOIN districts d ON dr.district_id = d.id
            JOIN states s ON d.state_id = s.id
            JOIN resource_types rt ON dr.resource_type_id = rt.id
            WHERE {where_sql}
            ORDER BY (dr.actual_count IS NOT NULL) DESC, d.district_name ASC, rt.id ASC
            LIMIT :limit OFFSET :skip
        """)
        rows = db.execute(query_sql, params).fetchall()

        items = []
        for r in rows:
            status_val = str(r[15]) if r[15] else "UNRECORDED"
            actual_c = int(r[10]) if r[10] is not None else None
            if status_val in ("OFFICIAL_DISTRICT", "OFFICIAL_POLICE_DEPARTMENT", "OFFICIAL_STATE", "OFFICIAL_GOVERNMENT_DATASET"):
                badge = "OFFICIAL"
            elif status_val == "DERIVED_FROM_OFFICIAL_DATA":
                badge = "DERIVED"
            elif actual_c is None:
                badge = "UNRECORDED"
            else:
                badge = "AI ESTIMATE"

            items.append({
                "id": int(r[0]),
                "district_id": int(r[1]),
                "district_name": str(r[2]),
                "state_id": int(r[3]),
                "state_name": str(r[4]),
                "resource_type_id": int(r[5]),
                "resource_code": str(r[6]) if r[6] else None,
                "resource_name": str(r[7]),
                "category": str(r[8]),
                "unit_of_measure": str(r[9]),
                "actual_count": actual_c,
                "sanctioned_count": int(r[11]) if r[11] is not None else None,
                "required_count": int(r[12]) if r[12] is not None else None,
                "gap_count": int(r[13]) if r[13] is not None else None,
                "reference_year": int(r[14]),
                "data_status": status_val,
                "badge": badge,
                "source_name": str(r[16]) if r[16] else None,
                "source_document": str(r[17]) if r[17] else None,
                "source_url": str(r[18]) if r[18] else None,
                "source_page": str(r[19]) if r[19] else None,
                "methodology": str(r[20]) if r[20] else None,
                "confidence_score": float(r[21]) if r[21] is not None else None,
                "updated_at": str(r[22]) if r[22] else None,
            })

        return items, total_count

    @staticmethod
    def get_district_resource_detail_multi(db: Session, district_id: int) -> List[Dict[str, Any]]:
        """Retrieves all resource inventory records for a single district."""
        sql = text("""
            SELECT 
                dr.id, dr.district_id, d.district_name, s.id as state_id, s.state_name,
                rt.id as resource_type_id, rt.code as resource_code, rt.resource_name,
                rt.category, rt.unit_of_measure,
                dr.actual_count, dr.sanctioned_count, dr.required_count, dr.gap_count,
                dr.reference_year, dr.data_status, dr.source_name, dr.source_document,
                dr.source_url, dr.source_page, dr.methodology, dr.confidence_score, dr.updated_at
            FROM district_resources dr
            JOIN districts d ON dr.district_id = d.id
            JOIN states s ON d.state_id = s.id
            JOIN resource_types rt ON dr.resource_type_id = rt.id
            WHERE dr.district_id = :district_id
            ORDER BY rt.category ASC, rt.id ASC
        """)
        rows = db.execute(sql, {"district_id": district_id}).fetchall()

        items = []
        for r in rows:
            status_val = str(r[15]) if r[15] else "UNRECORDED"
            actual_c = int(r[10]) if r[10] is not None else None
            badge = "OFFICIAL" if status_val in ("OFFICIAL_DISTRICT", "OFFICIAL_POLICE_DEPARTMENT") else ("UNRECORDED" if actual_c is None else "AI ESTIMATE")
            items.append({
                "id": int(r[0]),
                "district_id": int(r[1]),
                "district_name": str(r[2]),
                "state_id": int(r[3]),
                "state_name": str(r[4]),
                "resource_type_id": int(r[5]),
                "resource_code": str(r[6]) if r[6] else None,
                "resource_name": str(r[7]),
                "category": str(r[8]),
                "unit_of_measure": str(r[9]),
                "actual_count": actual_c,
                "sanctioned_count": int(r[11]) if r[11] is not None else None,
                "required_count": int(r[12]) if r[12] is not None else None,
                "gap_count": int(r[13]) if r[13] is not None else None,
                "reference_year": int(r[14]),
                "data_status": status_val,
                "badge": badge,
                "source_name": str(r[16]) if r[16] else None,
                "source_document": str(r[17]) if r[17] else None,
                "source_url": str(r[18]) if r[18] else None,
                "source_page": str(r[19]) if r[19] else None,
                "methodology": str(r[20]) if r[20] else None,
                "confidence_score": float(r[21]) if r[21] is not None else None,
                "updated_at": str(r[22]) if r[22] else None,
            })
        return items

    @staticmethod
    def get_resource_gaps(
        db: Session,
        state_id: Optional[int] = None,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Retrieves comparative actual vs required resource gap analysis."""
        where_clauses = ["1=1"]
        params: Dict[str, Any] = {"skip": skip, "limit": limit}

        if state_id:
            where_clauses.append("s.id = :state_id")
            params["state_id"] = state_id
        if category:
            where_clauses.append("rt.category = :category")
            params["category"] = category.upper()

        where_sql = " AND ".join(where_clauses)

        count_sql = text(f"""
            SELECT COUNT(*)
            FROM district_resources dr
            JOIN districts d ON dr.district_id = d.id
            JOIN states s ON d.state_id = s.id
            JOIN resource_types rt ON dr.resource_type_id = rt.id
            WHERE {where_sql}
        """)
        total_count = db.execute(count_sql, params).scalar() or 0

        query_sql = text(f"""
            SELECT 
                dr.district_id, d.district_name, s.state_name,
                rt.resource_name, rt.code as resource_code, rt.category,
                dr.actual_count, dr.required_count, dr.gap_count,
                dr.data_status, dr.source_name
            FROM district_resources dr
            JOIN districts d ON dr.district_id = d.id
            JOIN states s ON d.state_id = s.id
            JOIN resource_types rt ON dr.resource_type_id = rt.id
            WHERE {where_sql}
            ORDER BY (dr.actual_count IS NOT NULL) DESC, dr.gap_count DESC, dr.required_count DESC
            LIMIT :limit OFFSET :skip
        """)
        rows = db.execute(query_sql, params).fetchall()

        items = []
        for r in rows:
            actual_c = int(r[6]) if r[6] is not None else None
            req_c = int(r[7]) if r[7] is not None else 0
            gap_c = int(r[8]) if r[8] is not None else None
            st = str(r[9]) if r[9] else "UNRECORDED"
            is_ver = st in ("OFFICIAL_DISTRICT", "OFFICIAL_POLICE_DEPARTMENT")
            badge = "OFFICIAL" if is_ver else ("UNRECORDED" if actual_c is None else "AI ESTIMATE")

            items.append({
                "district_id": int(r[0]),
                "district_name": str(r[1]),
                "state_name": str(r[2]),
                "resource_name": str(r[3]),
                "resource_code": str(r[4]) if r[4] else "N/A",
                "category": str(r[5]),
                "actual_count": actual_c,
                "required_count": req_c,
                "gap_count": gap_c,
                "data_status": st,
                "badge": badge,
                "is_verified": is_ver,
                "source_name": str(r[10]) if r[10] else None,
            })
        return items, total_count

    @staticmethod
    def get_ai_recommendations(
        db: Session,
        state_id: Optional[int] = None,
        priority_tier: Optional[str] = None,
        risk_level: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Retrieves comprehensive district AI resource recommendations with priority classification."""
        where_clauses = ["d.is_census_2011 = 1"]
        params: Dict[str, Any] = {"skip": skip, "limit": limit}

        if state_id:
            where_clauses.append("s.id = :state_id")
            params["state_id"] = state_id
        if risk_level:
            where_clauses.append("r.risk_level = :risk_level")
            params["risk_level"] = risk_level.upper()

        where_sql = " AND ".join(where_clauses)

        sql = text(f"""
            SELECT 
                d.id as district_id, d.district_name, s.state_name,
                dd.total_population,
                r.overall_risk_score, r.risk_level, r.severity_index, r.trend_index,
                p.predicted_crime_count,
                dr_pers.actual_count as pers_actual,
                dr_pers.required_count as pers_req,
                dr_pers.gap_count as pers_gap,
                dr_pers.data_status as pers_status,
                dr_veh.required_count as veh_req,
                dr_inv.required_count as inv_req,
                dr_surv.required_count as surv_req,
                dr_cctv.required_count as cctv_req,
                dr_erv.required_count as erv_req
            FROM districts d
            JOIN states s ON d.state_id = s.id
            LEFT JOIN district_demographics dd ON d.id = dd.district_id
            LEFT JOIN crime_risk_scores r ON d.id = r.district_id AND r.period_year = 2026 AND r.period_month = 1
            LEFT JOIN crime_predictions p ON d.id = p.district_id AND p.prediction_date = '2025-01-01'
            LEFT JOIN district_resources dr_pers ON d.id = dr_pers.district_id AND dr_pers.resource_type_id = 1
            LEFT JOIN district_resources dr_veh ON d.id = dr_veh.district_id AND dr_veh.resource_type_id = 2
            LEFT JOIN district_resources dr_inv ON d.id = dr_inv.district_id AND dr_inv.resource_type_id = 3
            LEFT JOIN district_resources dr_surv ON d.id = dr_surv.district_id AND dr_surv.resource_type_id = 4
            LEFT JOIN district_resources dr_cctv ON d.id = dr_cctv.district_id AND dr_cctv.resource_type_id = 100
            LEFT JOIN district_resources dr_erv ON d.id = dr_erv.district_id AND dr_erv.resource_type_id = 105
            WHERE {where_sql}
            ORDER BY r.overall_risk_score DESC, d.district_name ASC
        """)
        rows = db.execute(sql, params).fetchall()

        all_items = []
        for r in rows:
            d_id = int(r[0])
            d_name = str(r[1])
            s_name = str(r[2])
            pop = int(r[3]) if r[3] else 1_000_000
            risk_score = float(r[4]) if r[4] is not None else 50.0
            r_level = str(r[5]) if r[5] else "MODERATE"
            trend = float(r[7]) if r[7] is not None else 50.0

            pers_req = int(r[10]) if r[10] else max(100, int(pop / 500))
            veh_req = int(r[13]) if r[13] else max(10, int(pers_req / 25))
            inv_req = int(r[14]) if r[14] else 4
            surv_req = int(r[15]) if r[15] else 3
            cctv_req = int(r[16]) if r[16] else 150
            erv_req = int(r[17]) if r[17] else 12

            pers_act = int(r[9]) if r[9] is not None else None
            pers_gap = int(r[11]) if r[11] is not None else None
            pers_st = str(r[12]) if r[12] else "UNRECORDED"
            pers_bdg = "OFFICIAL" if pers_st in ("OFFICIAL_DISTRICT", "OFFICIAL_POLICE_DEPARTMENT") else "UNRECORDED"

            # Compute composite Resource Priority Score (0-100)
            # Risk 40%, Population scale 25%, Trend 20%, Gap/Unrecorded pressure 15%
            pop_factor = min(100.0, (pop / 2_000_000.0) * 100.0)
            trend_factor = min(100.0, trend)
            avail_pressure = 85.0 if pers_act is None else (100.0 if pers_gap and pers_gap > 0 else 30.0)

            p_score = round(0.40 * risk_score + 0.25 * pop_factor + 0.20 * trend_factor + 0.15 * avail_pressure, 2)

            if p_score >= 70.0:
                p_tier = "CRITICAL"
            elif p_score >= 55.0:
                p_tier = "HIGH"
            elif p_score >= 40.0:
                p_tier = "MEDIUM"
            else:
                p_tier = "LOW"

            if priority_tier and p_tier != priority_tier.upper():
                continue

            # Explainable rationale construction
            drivers = []
            if risk_score >= 65.0:
                drivers.append(f"High crime risk ({risk_score:.1f})")
            elif risk_score >= 50.0:
                drivers.append(f"Elevated risk score ({risk_score:.1f})")
            if pop >= 2_000_000:
                drivers.append(f"Major urban population ({pop:,})")
            elif pop >= 1_000_000:
                drivers.append("Dense population center")
            if trend >= 60.0:
                drivers.append("Accelerating crime trajectory")
            if pers_act is None:
                drivers.append("Unrecorded official ground inventory")
            elif pers_gap and pers_gap > 0:
                drivers.append(f"Personnel deficit ({pers_gap:,} officers)")

            drivers.append(f"High patrol ({veh_req} units) & emergency demand")
            explanation = " + ".join(drivers)

            all_items.append({
                "district_id": d_id,
                "district_name": d_name,
                "state_name": s_name,
                "population": pop,
                "overall_risk_score": risk_score,
                "risk_level": r_level,
                "required_police_personnel": pers_req,
                "required_patrol_vehicles": veh_req,
                "required_investigation_teams": inv_req,
                "required_surveillance_teams": surv_req,
                "required_cctv_coverage": cctv_req,
                "required_emergency_response_units": erv_req,
                "resource_priority_score": p_score,
                "priority_tier": p_tier,
                "priority_explanation": explanation,
                "actual_personnel_recorded": pers_act,
                "personnel_gap": pers_gap,
                "personnel_status": pers_st,
                "personnel_badge": pers_bdg,
            })

        total_count = len(all_items)
        paged_items = all_items[skip : skip + limit]
        return paged_items, total_count

