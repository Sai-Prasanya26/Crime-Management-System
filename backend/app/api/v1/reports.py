"""
Reports API Router for Phase 12 Crime Intelligence Reporting.
Handles report emailing, PDF compilation, recipient verification,
and jurisdictional scope resolution.
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.api.deps import get_current_user
from backend.app.models.auth import User
from backend.app.repositories.geography_repository import GeographyRepository
from backend.app.services.email_service import (
    send_report_email,
    EmailConfigurationError,
    EmailDeliveryError,
)
from backend.app.services.pdf_report_service import PdfReportService
from backend.app.services.crime_analytics_service import CrimeAnalyticsService

router = APIRouter()

ALLOWED_REPORT_TYPES = {
    "CRIME_STATISTICS",
    "CRIME_PREDICTIONS",
    "RISK_ASSESSMENT",
    "RESOURCE_ALLOCATION",
    "BUDGET_ANALYSIS",
    "COMPREHENSIVE_CRIME",
}

ALLOWED_SCOPES = {
    "ALL_INDIA",
    "STATE",
    "DISTRICT",
}


class EmailPdfReportRequest(BaseModel):
    report_type: str = Field(..., description="Report type name")
    scope: str = Field(..., description="Reporting scope: 'ALL_INDIA', 'STATE', or 'DISTRICT'")
    state_id: Optional[int] = Field(None, description="Optional State ID")
    district_id: Optional[int] = Field(None, description="Optional District ID")
    reporting_period: Optional[str] = Field(None, description="Reporting period string (e.g. '2026-11-01' or 'ALL')")
    report_data: Optional[Dict[str, Any]] = Field(None, description="Optional pre-assembled report payload from preview")


@router.post("/email-pdf", summary="Email Generated PDF Report to Authenticated User")
def email_pdf_report(
    payload: EmailPdfReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate the official report PDF matching the active filters and dispatch it
    as an attachment strictly to the authenticated user's registered email address.
    """
    # 1. Validate Report Type
    if payload.report_type not in ALLOWED_REPORT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid report type '{payload.report_type}'. Allowed types: {', '.join(sorted(ALLOWED_REPORT_TYPES))}",
        )

    # 2. Validate Scope
    scope = payload.scope.upper()
    if scope not in ALLOWED_SCOPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid scope '{payload.scope}'. Allowed scopes: {', '.join(sorted(ALLOWED_SCOPES))}",
        )

    # 3. Resolve Geography & Jurisdiction
    jurisdiction_label = "All India (36 States & Union Territories)"
    subject_jurisdiction = "All India"

    if scope == "DISTRICT":
        if not payload.district_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="district_id is required when scope is 'DISTRICT'.",
            )
        district = GeographyRepository.get_district_by_id(db, payload.district_id)
        if not district:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"District with id {payload.district_id} was not found.",
            )
        state = district.state
        state_name = state.state_name.title() if (state and state.state_name.isupper()) else (state.state_name if state else "State")
        dist_name = district.district_name.title() if district.district_name.isupper() else district.district_name
        jurisdiction_label = f"{dist_name}, {state_name}"
        subject_jurisdiction = dist_name

    elif scope == "STATE":
        if not payload.state_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="state_id is required when scope is 'STATE'.",
            )
        state = GeographyRepository.get_state_by_id(db, payload.state_id)
        if not state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"State with id {payload.state_id} was not found.",
            )
        clean_state_name = state.state_name.title() if state.state_name.isupper() else state.state_name
        jurisdiction_label = f"{clean_state_name} (All Districts)"
        subject_jurisdiction = clean_state_name

    # 4. Resolve Report Title
    if payload.report_type == "COMPREHENSIVE_CRIME":
        if scope == "DISTRICT":
            report_title = "District Crime Profile"
        elif scope == "STATE":
            report_title = "State Crime Report"
        else:
            report_title = "All India Crime Report"
    elif payload.report_type == "CRIME_STATISTICS":
        report_title = "Crime Statistics Report"
    elif payload.report_type == "CRIME_PREDICTIONS":
        report_title = "Crime Prediction Report"
    elif payload.report_type == "RISK_ASSESSMENT":
        report_title = "Crime Risk Assessment Report"
    elif payload.report_type == "RESOURCE_ALLOCATION":
        report_title = "Resource Allocation Report"
    elif payload.report_type == "BUDGET_ANALYSIS":
        report_title = "Budget Analysis Report"
    else:
        report_title = "Crime Intelligence Report"

    # 5. Resolve Period String
    period_str = payload.reporting_period or "All Available Data"
    if period_str == "ALL" or not payload.reporting_period:
        period_str = "All Available Historical Data (2020–2025)"
    elif period_str.startswith("2026-11"):
        period_str = "November 2026"
    elif period_str.startswith("2026-12"):
        period_str = "December 2026"

    # 6. Extract / Assemble Report Content
    summary_cards: List[Dict[str, str]] = []
    sections: Optional[List[Dict[str, Any]]] = None
    table_headers: Optional[List[Dict[str, str]]] = None
    table_rows: Optional[List[Dict[str, Any]]] = None

    if payload.report_data:
        # Use data passed from frontend preview
        rd = payload.report_data
        summary_cards = rd.get("summary_cards", [])
        sections = rd.get("sections")
        table_headers = rd.get("table_headers")
        table_rows = rd.get("table_rows")
        if "period_formatted" in rd and rd["period_formatted"]:
            period_str = rd["period_formatted"]
        if "report_title" in rd and rd["report_title"]:
            report_title = rd["report_title"]
        if "jurisdiction" in rd and rd["jurisdiction"]:
            jurisdiction_label = rd["jurisdiction"]
    else:
        # Assemble fallback data via analytics repository
        overview = CrimeAnalyticsService.get_overview(
            db=db,
            state_id=payload.state_id if scope in ("STATE", "DISTRICT") else None,
            district_id=payload.district_id if scope == "DISTRICT" else None,
        )
        summary_cards = [
            {"title": "Total Incidents", "value": f"{overview.total_incidents:,}", "subtext": f"Clearance: {overview.cases.clearance_rate_pct:.1f}%"},
            {"title": "Solved Cases", "value": f"{overview.cases.closed:,}", "subtext": "Investigations Closed"},
            {"title": "Active Cases", "value": f"{overview.cases.open:,}", "subtext": "Pending Action"},
            {"title": "Jurisdiction", "value": subject_jurisdiction, "subtext": scope.replace("_", " ").title()},
        ]
        table_headers = [
            {"key": "metric", "label": "Operational Metric"},
            {"key": "value", "label": "Value", "align": "right"},
        ]
        table_rows = [
            {"metric": "Report Type", "value": report_title},
            {"metric": "Scope", "value": scope},
            {"metric": "Jurisdiction", "value": jurisdiction_label},
            {"metric": "Reporting Period", "value": period_str},
            {"metric": "Total Recorded Incidents", "value": f"{overview.total_incidents:,}"},
            {"metric": "Clearance Rate", "value": f"{overview.cases.clearance_rate_pct:.1f}%"},
        ]

    # 7. Generate PDF Document
    pdf_bytes = PdfReportService.generate_pdf(
        report_title=report_title,
        jurisdiction=jurisdiction_label,
        reporting_period=period_str,
        recipient_email=current_user.email,
        summary_cards=summary_cards,
        sections=sections,
        table_headers=table_headers,
        table_rows=table_rows,
    )

    # 8. Dispatch Email Strictly to Authenticated User
    subject = f"Your Crime Intelligence Report – {subject_jurisdiction}"
    safe_period = period_str.replace(" ", "_").replace("–", "-")
    safe_type = payload.report_type.lower()
    filename = f"Crime_Report_{scope}_{safe_type}_{safe_period}.pdf"

    try:
        dispatch_result = send_report_email(
            recipient_email=current_user.email,
            recipient_name=current_user.full_name or current_user.username,
            subject=subject,
            report_title=report_title,
            jurisdiction=jurisdiction_label,
            reporting_period=period_str,
            pdf_bytes=pdf_bytes,
            filename=filename,
        )
    except EmailConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    except EmailDeliveryError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )

    return {
        "status": "success",
        "message": f"Report successfully emailed to {current_user.email}.",
        "recipient": current_user.email,
        "report_title": report_title,
        "jurisdiction": jurisdiction_label,
        "reporting_period": period_str,
        "filename": filename,
        "bytes_generated": len(pdf_bytes),
        "delivery": dispatch_result,
    }
