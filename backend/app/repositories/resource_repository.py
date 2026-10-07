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
            SELECT district_id, resource_type_id, available_quantity
            FROM district_resources
            WHERE period_year = :py AND period_month = :pm
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
