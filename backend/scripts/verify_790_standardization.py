"""
Verification Suite for 790 Active District Standardization.
Runs automated tests TEST-01 through TEST-10.
"""

import sys
import os
import re
from typing import Dict, Any, List

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.database.session import SessionLocal
from backend.app.models.geography import District, State, DistrictGeographyMapping
from backend.app.models.crime import CrimeIncident
from backend.app.models.demographics import DistrictDemographics
from backend.app.models.ml import CrimePrediction, MLModel
from backend.app.models.intelligence import CrimeRiskScore
from backend.app.models.budget import DistrictBudgetAllocation
from backend.app.repositories.geography_repository import GeographyRepository
from backend.app.repositories.risk_repository import RiskRepository
from backend.app.repositories.prediction_repository import PredictionRepository
from sqlalchemy import func, text


def run_tests():
    db = SessionLocal()
    results = {}
    
    print("=" * 80)
    print("  790 ACTIVE DISTRICT STANDARDIZATION — SYSTEM VERIFICATION SUITE")
    print("=" * 80)

    # -------------------------------------------------------------
    # TEST-01: Canonical District Count
    # -------------------------------------------------------------
    total_dists = db.query(District).count()
    active_dists = db.query(District).filter(District.is_current_admin == True).count()
    inactive_dists = db.query(District).filter(District.is_current_admin == False).count()
    test01_pass = (total_dists == 813 and active_dists == 790 and inactive_dists == 23)
    results["TEST-01"] = {
        "name": "Canonical District Roster Integrity",
        "passed": test01_pass,
        "details": f"Total: {total_dists} (exp 813), Active: {active_dists} (exp 790), Inactive: {inactive_dists} (exp 23)"
    }
    print(f"[{'PASS' if test01_pass else 'FAIL'}] TEST-01: {results['TEST-01']['details']}")

    # -------------------------------------------------------------
    # TEST-02: Integrity of Parent-Child Relationships
    # -------------------------------------------------------------
    carved_dists = db.query(District).filter(District.parent_district_id != None, District.is_current_admin == True).all()
    carved_count = len(carved_dists)
    all_dist_ids = {d.id for d in db.query(District.id).all()}
    broken_parents = [d.id for d in carved_dists if d.parent_district_id not in all_dist_ids]
    test02_pass = (carved_count == 164 and len(broken_parents) == 0)
    results["TEST-02"] = {
        "name": "Reorganized Parent-Child Linkage Integrity",
        "passed": test02_pass,
        "details": f"Active carved districts: {carved_count} (exp 164), Broken parent links: {len(broken_parents)} (exp 0)"
    }
    print(f"[{'PASS' if test02_pass else 'FAIL'}] TEST-02: {results['TEST-02']['details']}")

    # -------------------------------------------------------------
    # TEST-03: Historical Crime Incident Preservation
    # -------------------------------------------------------------
    total_incidents = db.query(CrimeIncident).count()
    transferred_count = db.query(CrimeIncident).filter(CrimeIncident.reconciliation_status == '1_TO_1_SUCCESSION').count()
    unresolved_count = db.query(CrimeIncident).filter(CrimeIncident.reconciliation_status == 'UNRESOLVED_HISTORICAL_GEOGRAPHY').count()
    test03_pass = (total_incidents == 191679 and transferred_count == 829 and unresolved_count == 4818)
    results["TEST-03"] = {
        "name": "Incident Preservation and Historical Provenance",
        "passed": test03_pass,
        "details": f"Total Incidents: {total_incidents} (exp strictly 191679), 1:1 Transferred: {transferred_count} (exp 829), Unresolved Historical: {unresolved_count} (exp 4818)"
    }
    print(f"[{'PASS' if test03_pass else 'FAIL'}] TEST-03: {results['TEST-03']['details']}")

    # -------------------------------------------------------------
    # TEST-04: Demographic Provenance & Zero Duplication
    # -------------------------------------------------------------
    total_demos = db.query(DistrictDemographics).count()
    authentic_count = db.query(DistrictDemographics).filter(DistrictDemographics.data_provenance == 'OFFICIAL_CENSUS_2011').count()
    transferred_demo_count = db.query(DistrictDemographics).filter(DistrictDemographics.data_provenance == 'TRANSFERRED_CENSUS_2011').count()
    unavailable_demo_count = db.query(DistrictDemographics).filter(DistrictDemographics.data_provenance == 'UNAVAILABLE').count()
    null_pop_in_unavailable = db.query(DistrictDemographics).filter(
        DistrictDemographics.data_provenance == 'UNAVAILABLE',
        DistrictDemographics.total_population == None
    ).count()
    test04_pass = (
        total_demos == 804 and 
        authentic_count == 640 and 
        transferred_demo_count == 3 and 
        unavailable_demo_count == 161 and 
        null_pop_in_unavailable == 161
    )
    results["TEST-04"] = {
        "name": "Demographic Provenance & Zero Duplication Integrity",
        "passed": test04_pass,
        "details": f"Total Demographics: {total_demos} (exp 804), Official Census 2011: {authentic_count} (exp 640), 1:1 Transferred: {transferred_demo_count} (exp 3), Unavailable (NULL pop): {null_pop_in_unavailable}/{unavailable_demo_count} (exp 161/161)"
    }
    print(f"[{'PASS' if test04_pass else 'FAIL'}] TEST-04: {results['TEST-04']['details']}")

    # -------------------------------------------------------------
    # TEST-05: Prediction Coverage (9,480 Forward Predictions)
    # -------------------------------------------------------------
    active_model = db.query(MLModel).filter(MLModel.is_active == True).first()
    forward_preds = (
        db.query(CrimePrediction)
        .join(District, CrimePrediction.district_id == District.id)
        .filter(
            CrimePrediction.model_id == active_model.id,
            CrimePrediction.forecast_status == 'CURRENT_FUTURE_FORECAST',
            District.is_current_admin == True
        )
        .count()
    )
    derived_preds = (
        db.query(CrimePrediction)
        .join(District, CrimePrediction.district_id == District.id)
        .filter(
            CrimePrediction.model_id == active_model.id,
            CrimePrediction.forecast_status == 'CURRENT_FUTURE_FORECAST',
            CrimePrediction.is_derived_from_parent == True,
            District.is_current_admin == True
        )
        .count()
    )
    districts_with_forward = (
        db.query(func.count(func.distinct(CrimePrediction.district_id)))
        .join(District, CrimePrediction.district_id == District.id)
        .filter(
            CrimePrediction.model_id == active_model.id,
            CrimePrediction.forecast_status == 'CURRENT_FUTURE_FORECAST',
            District.is_current_admin == True
        )
        .scalar()
    )
    test05_pass = (forward_preds == 9480 and derived_preds == 1968 and districts_with_forward == 790)
    results["TEST-05"] = {
        "name": "Multi-Step Forecasting Coverage (790 Canonical Districts)",
        "passed": test05_pass,
        "details": f"Forward Predictions: {forward_preds} (exp 9480 = 790x12), Derived: {derived_preds} (exp 1968 = 164x12), Districts Covered: {districts_with_forward} (exp 790)"
    }
    print(f"[{'PASS' if test05_pass else 'FAIL'}] TEST-05: {results['TEST-05']['details']}")

    # -------------------------------------------------------------
    # TEST-06: Risk Assessment Scaling (790 Scores per Period)
    # -------------------------------------------------------------
    nov26_scores = (
        db.query(CrimeRiskScore)
        .join(District, CrimeRiskScore.district_id == District.id)
        .filter(
            CrimeRiskScore.period_year == 2026,
            CrimeRiskScore.period_month == 11,
            District.is_current_admin == True
        )
        .count()
    )
    lineage_scores = (
        db.query(CrimeRiskScore)
        .join(District, CrimeRiskScore.district_id == District.id)
        .filter(
            CrimeRiskScore.period_year == 2026,
            CrimeRiskScore.period_month == 11,
            CrimeRiskScore.assessment_provenance == 'LINEAGE_INHERITED_BASELINE',
            District.is_current_admin == True
        )
        .count()
    )
    avg_score = (
        db.query(func.avg(CrimeRiskScore.overall_risk_score))
        .join(District, CrimeRiskScore.district_id == District.id)
        .filter(
            CrimeRiskScore.period_year == 2026,
            CrimeRiskScore.period_month == 11,
            District.is_current_admin == True
        )
        .scalar()
    )
    test06_pass = (nov26_scores == 790 and lineage_scores == 161 and abs(float(avg_score) - 50.0) < 0.1)
    results["TEST-06"] = {
        "name": "Phase 9 Risk Assessment Mathematical Scaling",
        "passed": test06_pass,
        "details": f"Nov 2026 Assessed: {nov26_scores} (exp 790), Lineage Inherited: {lineage_scores} (exp 161), Mean Risk Score: {float(avg_score):.2f} (exp ~50.00)"
    }
    print(f"[{'PASS' if test06_pass else 'FAIL'}] TEST-06: {results['TEST-06']['details']}")

    # -------------------------------------------------------------
    # TEST-07: Geographic Intelligence & Coordinates Alignment
    # -------------------------------------------------------------
    geo_districts = GeographyRepository.get_districts(db, view='current')
    geo_count = len(geo_districts)
    
    # Read districtCoordinates.ts
    coords_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/src/data/districtCoordinates.ts"))
    with open(coords_path, "r", encoding="utf-8") as f:
        coords_content = f.read()
    coords_ids = set(map(int, re.findall(r'id:\s*(\d+)', coords_content)))
    active_ids = {d.id for d in geo_districts}
    missing_coords = active_ids - coords_ids
    test07_pass = (geo_count == 790 and len(missing_coords) == 0)
    results["TEST-07"] = {
        "name": "Geographic Intelligence & Cartographic Coordinates Alignment",
        "passed": test07_pass,
        "details": f"Active Districts via Repository: {geo_count} (exp 790), Active IDs mapped in districtCoordinates.ts: {len(active_ids.intersection(coords_ids))}/790, Missing: {len(missing_coords)}"
    }
    print(f"[{'PASS' if test07_pass else 'FAIL'}] TEST-07: {results['TEST-07']['details']}")

    # -------------------------------------------------------------
    # TEST-08: Risk Assessment Repository & Jurisdiction Summary
    # -------------------------------------------------------------
    risk_overview = RiskRepository.get_overview(db, period_year=2026, period_month=11)
    risk_items, risk_total = RiskRepository.list_risk_scores(db, period_year=2026, period_month=11, limit=10)
    _, tg_risk_count = RiskRepository.list_risk_scores(db, period_year=2026, period_month=11, state_id=36, limit=10)
    _, ap_risk_count = RiskRepository.list_risk_scores(db, period_year=2026, period_month=11, state_id=2, limit=10)
    state_summaries = RiskRepository.get_state_risk_summary(db, period_year=2026, period_month=11)
    summary_dist_total = sum(s["assessed_districts_count"] for s in state_summaries)
    
    test08_pass = (
        risk_overview.get("total_assessed_districts") == 790 and
        risk_total == 790 and
        tg_risk_count == 33 and
        ap_risk_count == 28 and
        summary_dist_total == 790 and
        len(state_summaries) == 36
    )
    results["TEST-08"] = {
        "name": "Risk Assessment Repository & State Summaries Roster",
        "passed": test08_pass,
        "details": f"Overview Districts: {risk_overview.get('total_assessed_districts')} (exp 790), List Total: {risk_total} (exp 790), Telangana: {tg_risk_count} (exp 33), AP: {ap_risk_count} (exp 28), State Summary Sum: {summary_dist_total} across {len(state_summaries)} states (exp 790 across 36)"
    }
    print(f"[{'PASS' if test08_pass else 'FAIL'}] TEST-08: {results['TEST-08']['details']}")

    # -------------------------------------------------------------
    # TEST-09: Prediction Repository & Filtering
    # -------------------------------------------------------------
    pred_overview = PredictionRepository.get_overview(db)
    _, pred_total = PredictionRepository.list_predictions(db, forecast_period="2026-11-01", limit=10)
    _, tg_pred_count = PredictionRepository.list_predictions(db, state_id=36, forecast_period="2026-11-01", limit=10)
    _, ap_pred_count = PredictionRepository.list_predictions(db, state_id=2, forecast_period="2026-11-01", limit=10)
    test09_pass = (
        pred_overview.get("districts_covered") == 790 and
        pred_total == 790 and
        tg_pred_count == 33 and
        ap_pred_count == 28
    )
    results["TEST-09"] = {
        "name": "Prediction Repository & Modern Jurisdiction Filtering",
        "passed": test09_pass,
        "details": f"Overview Covered: {pred_overview.get('districts_covered')} (exp 790), Period Total: {pred_total} (exp 790), Telangana: {tg_pred_count} (exp 33), AP: {ap_pred_count} (exp 28)"
    }
    print(f"[{'PASS' if test09_pass else 'FAIL'}] TEST-09: {results['TEST-09']['details']}")

    # -------------------------------------------------------------
    # TEST-10: Budget Allocation Alignment
    # -------------------------------------------------------------
    active_budget_count = (
        db.query(func.count(func.distinct(DistrictBudgetAllocation.district_id)))
        .join(District, DistrictBudgetAllocation.district_id == District.id)
        .filter(District.is_current_admin == True)
        .scalar()
    )
    test10_pass = (active_budget_count == 790)
    results["TEST-10"] = {
        "name": "Resource & Budget Allocation Alignment",
        "passed": test10_pass,
        "details": f"Active Districts with Budget Allocations: {active_budget_count} (exp 790)"
    }
    print(f"[{'PASS' if test10_pass else 'FAIL'}] TEST-10: {results['TEST-10']['details']}")

    print("=" * 80)
    passed_total = sum(1 for v in results.values() if v["passed"])
    print(f"  TOTAL RESULT: {passed_total}/10 TESTS PASSED")
    print("=" * 80)

    db.close()
    return results


if __name__ == "__main__":
    run_tests()
