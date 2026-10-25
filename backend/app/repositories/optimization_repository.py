"""
Phase 10: Optimization Repository.

Handles database queries and transactional persistence for:
- Official state resource pools and baseline district inventories
- Demographic and crime forecast inputs
- Phase 9 risk scores
- Optimization runs and district allocation records
"""

from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, date

from backend.app.models.optimization import OptimizationRun, OptimizationAllocation


class OptimizationRepository:

    @staticmethod
    def get_state_resource_pool(
        db: Session,
        state_id: int,
        resource_type_id: int,
    ) -> Optional[Dict[str, Any]]:
        """Retrieves verified official state standing pool from state_resources."""
        sql = text("""
            SELECT 
                sr.id,
                sr.state_id,
                s.state_name,
                sr.resource_type_id,
                rt.resource_name,
                rt.category,
                sr.actual_count,
                sr.sanctioned_count,
                sr.reference_year,
                sr.data_status,
                sr.source_name,
                sr.source_publication,
                sr.data_as_of
            FROM state_resources sr
            JOIN states s ON sr.state_id = s.id
            JOIN resource_types rt ON sr.resource_type_id = rt.id
            WHERE sr.state_id = :state_id AND sr.resource_type_id = :resource_type_id
            ORDER BY sr.reference_year DESC
            LIMIT 1
        """)
        row = db.execute(sql, {"state_id": state_id, "resource_type_id": resource_type_id}).fetchone()
        if not row:
            return None
        return {
            "id": row[0],
            "state_id": row[1],
            "state_name": row[2],
            "resource_type_id": row[3],
            "resource_name": row[4],
            "category": row[5],
            "actual_count": row[6],
            "sanctioned_count": row[7],
            "reference_year": row[8],
            "data_status": row[9],
            "source_name": row[10],
            "source_publication": row[11],
            "data_as_of": row[12],
        }

    @staticmethod
    def get_eligible_districts(
        db: Session,
        state_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieves eligible administrative Census 2011 districts with demographics."""
        conditions = ["d.is_census_2011 = 1"]
        params: Dict[str, Any] = {}
        if state_id is not None:
            conditions.append("d.state_id = :state_id")
            params["state_id"] = state_id

        where_clause = " AND ".join(conditions)
        sql = text(f"""
            SELECT 
                d.id AS district_id,
                d.district_name,
                d.state_id,
                s.state_name,
                COALESCE(dd.total_population, 500000) AS population
            FROM districts d
            JOIN states s ON d.state_id = s.id
            LEFT JOIN district_demographics dd ON d.id = dd.district_id
            WHERE {where_clause}
            ORDER BY d.state_id, d.district_name
        """)
        rows = db.execute(sql, params).fetchall()
        return [
            {
                "district_id": r[0],
                "district_name": r[1],
                "state_id": r[2],
                "state_name": r[3],
                "population": int(r[4]),
            }
            for r in rows
        ]

    @staticmethod
    def get_district_risk_scores(
        db: Session,
        district_ids: List[int],
        period_year: int,
        period_month: int,
        calculation_version: str = "risk-v2.0",
    ) -> Dict[int, Dict[str, Any]]:
        """Retrieves Phase 9 district risk scores for the specified horizon period."""
        if not district_ids:
            return {}

        # First attempt: exact match on year, month, calculation_version
        sql = text("""
            SELECT 
                district_id,
                overall_risk_score,
                risk_level,
                severity_index,
                trend_index,
                forecast_index,
                score_type,
                model_id,
                model_version,
                forecast_origin_date,
                strongest_driver
            FROM crime_risk_scores
            WHERE district_id IN :dids 
              AND period_year = :py 
              AND period_month = :pm 
              AND calculation_version = :ver
        """)
        rows = db.execute(sql, {"dids": tuple(district_ids), "py": period_year, "pm": period_month, "ver": calculation_version}).fetchall()
        
        # Fallback if no rows: find latest risk scores for these districts
        if not rows:
            sql_fallback = text("""
                SELECT 
                    crs.district_id,
                    crs.overall_risk_score,
                    crs.risk_level,
                    crs.severity_index,
                    crs.trend_index,
                    crs.forecast_index,
                    crs.score_type,
                    crs.model_id,
                    crs.model_version,
                    crs.forecast_origin_date,
                    crs.strongest_driver
                FROM crime_risk_scores crs
                INNER JOIN (
                    SELECT district_id, MAX(period_year * 100 + period_month) as max_p
                    FROM crime_risk_scores
                    WHERE district_id IN :dids
                    GROUP BY district_id
                ) latest ON crs.district_id = latest.district_id 
                        AND (crs.period_year * 100 + crs.period_month) = latest.max_p
            """)
            rows = db.execute(sql_fallback, {"dids": tuple(district_ids)}).fetchall()

        result: Dict[int, Dict[str, Any]] = {}
        for r in rows:
            result[int(r[0])] = {
                "district_id": int(r[0]),
                "overall_risk_score": float(r[1]) if r[1] is not None else 50.0,
                "risk_level": str(r[2]) if r[2] else "MODERATE",
                "severity_index": float(r[3]) if r[3] is not None else 50.0,
                "trend_index": float(r[4]) if r[4] is not None else 50.0,
                "forecast_index": float(r[5]) if r[5] is not None else None,
                "score_type": str(r[6]) if r[6] else "FORECAST",
                "model_id": r[7],
                "model_version": r[8],
                "forecast_origin_date": r[9],
                "strongest_driver": r[10],
            }
        return result

    @staticmethod
    def get_district_forecasts(
        db: Session,
        district_ids: List[int],
        period_year: int,
        period_month: int,
    ) -> Dict[int, Dict[str, Any]]:
        """Retrieves Phase 8B future crime forecasts."""
        if not district_ids:
            return {}

        sql = text("""
            SELECT 
                cp.district_id,
                SUM(cp.predicted_crime_count) as total_predicted,
                MAX(cp.forecast_status) as forecast_status,
                MAX(cp.model_id) as model_id,
                MAX(m.model_name) as model_version,
                MAX(cp.forecast_origin_date) as forecast_origin_date
            FROM crime_predictions cp
            LEFT JOIN ml_models m ON cp.model_id = m.id
            WHERE cp.district_id IN :dids
              AND YEAR(cp.prediction_date) = :py
              AND MONTH(cp.prediction_date) = :pm
            GROUP BY cp.district_id
        """)
        rows = db.execute(sql, {"dids": tuple(district_ids), "py": period_year, "pm": period_month}).fetchall()

        result: Dict[int, Dict[str, Any]] = {}
        for r in rows:
            did = int(r[0])
            result[did] = {
                "predicted_count": float(r[1]) if r[1] is not None else 10.0,
                "forecast_status": str(r[2]) if r[2] else "CURRENT_FUTURE_FORECAST",
                "model_id": r[3],
                "model_version": r[4] or "phase8b_xgb_direct_h1",
                "forecast_origin_date": r[5],
            }
        return result

    @staticmethod
    def get_district_baseline_inventories(
        db: Session,
        district_ids: List[int],
        resource_type_id: int,
    ) -> Dict[int, Dict[str, Any]]:
        """Retrieves official district disclosures where actual_count IS NOT NULL."""
        if not district_ids:
            return {}

        sql = text("""
            SELECT 
                district_id,
                actual_count,
                sanctioned_count,
                data_status,
                source_name,
                reference_year
            FROM district_resources
            WHERE district_id IN :dids
              AND resource_type_id = :rtid
              AND actual_count IS NOT NULL
        """)
        rows = db.execute(sql, {"dids": tuple(district_ids), "rtid": resource_type_id}).fetchall()
        result: Dict[int, Dict[str, Any]] = {}
        for r in rows:
            result[int(r[0])] = {
                "actual_count": int(r[1]),
                "sanctioned_count": int(r[2]) if r[2] is not None else None,
                "data_status": str(r[3]),
                "source_name": str(r[4]),
                "reference_year": int(r[5]),
            }
        return result

    @staticmethod
    def save_optimization_run(
        db: Session,
        run_data: Dict[str, Any],
        allocations_data: List[Dict[str, Any]],
    ) -> OptimizationRun:
        """Atomically saves an optimization run and its district allocation line-items."""
        # 1. Insert or update OptimizationRun
        run = OptimizationRun(
            run_id=run_data["run_id"],
            scenario_name=run_data["scenario_name"],
            scenario_type=run_data.get("scenario_type", "BASELINE_CONSTRAINED"),
            state_id=run_data.get("state_id"),
            resource_type_id=run_data["resource_type_id"],
            period_year=run_data["period_year"],
            period_month=run_data["period_month"],
            assessment_period=run_data["assessment_period"],
            risk_version=run_data.get("risk_version", "risk-v2.0"),
            forecast_model_id=run_data.get("forecast_model_id"),
            forecast_model_version=run_data.get("forecast_model_version"),
            forecast_origin_date=run_data.get("forecast_origin_date"),
            algorithm=run_data.get("algorithm", "MILP_SCIPY_V2"),
            pool_capacity=run_data["pool_capacity"],
            allocated_total=run_data["allocated_total"],
            remaining_pool=run_data["remaining_pool"],
            total_demand=run_data["total_demand"],
            shortfall_before=run_data["shortfall_before"],
            shortfall_after=run_data["shortfall_after"],
            solver_status=run_data.get("solver_status", "OPTIMAL"),
            objective_value=run_data.get("objective_value"),
            execution_duration_ms=run_data.get("execution_duration_ms", 0),
            constraints_summary=run_data.get("constraints_summary"),
            explanation_summary=run_data.get("explanation_summary"),
            created_by_user_id=run_data.get("created_by_user_id"),
        )
        db.add(run)
        db.flush()

        # 2. Insert line-items into OptimizationAllocation
        for alloc in allocations_data:
            allocation = OptimizationAllocation(
                run_id=run.run_id,
                district_id=alloc["district_id"],
                baseline_quantity=alloc.get("baseline_quantity"),
                required_quantity=alloc["required_quantity"],
                recommended_quantity=alloc["recommended_quantity"],
                change_quantity=alloc["change_quantity"],
                shortfall_before=alloc["shortfall_before"],
                shortfall_after=alloc["shortfall_after"],
                priority_score=alloc.get("priority_score", 0.0),
                risk_score=alloc.get("risk_score", 0.0),
                risk_level=alloc.get("risk_level", "LOW"),
                allocation_status=alloc.get("allocation_status", "SATISFIED"),
                explanation=alloc.get("explanation"),
            )
            db.add(allocation)

        db.flush()
        return run

    @staticmethod
    def list_runs(
        db: Session,
        state_id: Optional[int] = None,
        resource_type_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[OptimizationRun], int]:
        """Lists optimization runs with pagination."""
        query = db.query(OptimizationRun)
        if state_id is not None:
            query = query.filter(OptimizationRun.state_id == state_id)
        if resource_type_id is not None:
            query = query.filter(OptimizationRun.resource_type_id == resource_type_id)

        total = query.count()
        runs = query.order_by(OptimizationRun.created_at.desc()).offset(skip).limit(limit).all()
        return runs, total

    @staticmethod
    def get_run_by_id(
        db: Session,
        run_id: str,
    ) -> Optional[OptimizationRun]:
        """Retrieves a single optimization run by run_id."""
        return db.query(OptimizationRun).filter(OptimizationRun.run_id == run_id).first()

    @staticmethod
    def list_allocations(
        db: Session,
        run_id: Optional[str] = None,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        resource_type_id: Optional[int] = None,
        risk_level: Optional[str] = None,
        allocation_status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Lists district allocation recommendations across runs."""
        conditions = []
        params: Dict[str, Any] = {}

        if run_id:
            conditions.append("oa.run_id = :run_id")
            params["run_id"] = run_id
        if state_id:
            conditions.append("d.state_id = :state_id")
            params["state_id"] = state_id
        if district_id:
            conditions.append("oa.district_id = :district_id")
            params["district_id"] = district_id
        if risk_level:
            conditions.append("oa.risk_level = :risk_level")
            params["risk_level"] = risk_level
        if allocation_status:
            conditions.append("oa.allocation_status = :allocation_status")
            params["allocation_status"] = allocation_status
        if resource_type_id:
            conditions.append("r.resource_type_id = :resource_type_id")
            params["resource_type_id"] = resource_type_id

        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

        count_sql = text(f"""
            SELECT COUNT(*)
            FROM optimization_allocations oa
            JOIN districts d ON oa.district_id = d.id
            JOIN optimization_runs r ON oa.run_id = r.run_id
            {where_clause}
        """)
        total = db.execute(count_sql, params).scalar() or 0

        data_sql = text(f"""
            SELECT 
                oa.district_id,
                d.district_name,
                s.state_name,
                oa.risk_score,
                oa.risk_level,
                oa.priority_score,
                oa.baseline_quantity,
                oa.required_quantity,
                oa.recommended_quantity,
                oa.change_quantity,
                oa.shortfall_before,
                oa.shortfall_after,
                oa.allocation_status,
                oa.explanation
            FROM optimization_allocations oa
            JOIN districts d ON oa.district_id = d.id
            JOIN states s ON d.state_id = s.id
            JOIN optimization_runs r ON oa.run_id = r.run_id
            {where_clause}
            ORDER BY oa.risk_score DESC, oa.shortfall_before DESC
            LIMIT :limit OFFSET :skip
        """)
        params["limit"] = limit
        params["skip"] = skip
        rows = db.execute(data_sql, params).fetchall()

        items = [
            {
                "district_id": r[0],
                "district_name": r[1],
                "state_name": r[2],
                "risk_score": float(r[3]),
                "risk_level": r[4],
                "priority_score": float(r[5]),
                "baseline_quantity": r[6],
                "required_quantity": r[7],
                "recommended_quantity": r[8],
                "change_quantity": r[9],
                "shortfall_before": r[10],
                "shortfall_after": r[11],
                "allocation_status": r[12],
                "explanation": r[13],
            }
            for r in rows
        ]
        return items, total
