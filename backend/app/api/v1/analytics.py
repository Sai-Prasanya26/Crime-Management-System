from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from backend.app.database.session import get_db
from backend.app.services.crime_analytics_service import CrimeAnalyticsService
from backend.app.schemas.analytics import (
    CrimeOverviewResponse,
    TrendResponse,
    CategoryBreakdownResponse,
    TypeBreakdownResponse,
    HourlyDistributionResponse,
    VictimDemographicsResponse,
    WeaponDistributionResponse,
    TopDistrictsResponse,
)

router = APIRouter()


@router.get(
    "/overview",
    response_model=CrimeOverviewResponse,
    summary="Get Crime Overview Statistics",
    description="Retrieve high-level crime intelligence aggregates including total incidents, clearance rate, active date range, and geographic scope.",
)
def get_overview(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    start_date: Optional[date] = Query(None, description="Filter incidents starting from (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter incidents up to (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
) -> CrimeOverviewResponse:
    return CrimeAnalyticsService.get_overview(
        db, state_id=state_id, district_id=district_id, start_date=start_date, end_date=end_date
    )


@router.get(
    "/trends",
    response_model=TrendResponse,
    summary="Get Crime Trends Over Time",
    description="Retrieve longitudinal incident volume trends grouped by year, month, or day.",
)
def get_trends(
    interval: str = Query("month", pattern="^(year|month|day)$", description="Aggregation interval (year, month, day)"),
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
) -> TrendResponse:
    return CrimeAnalyticsService.get_trends(
        db, interval=interval, state_id=state_id, district_id=district_id, start_date=start_date, end_date=end_date
    )


@router.get(
    "/by-category",
    response_model=CategoryBreakdownResponse,
    summary="Get Crime Distribution by Domain / Category",
    description="Retrieve crime incident distribution across high-level domains (Violent, Property, Traffic, Fire) with severity weights.",
)
def get_by_category(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
) -> CategoryBreakdownResponse:
    return CrimeAnalyticsService.get_categories(
        db, state_id=state_id, district_id=district_id, start_date=start_date, end_date=end_date
    )


@router.get(
    "/by-type",
    response_model=TypeBreakdownResponse,
    summary="Get Crime Distribution by Legal Crime Type",
    description="Retrieve crime counts, legal codes, and severity tiers for all 21 crime types.",
)
def get_by_type(
    category_id: Optional[int] = Query(None, description="Filter by Crime Category ID"),
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
) -> TypeBreakdownResponse:
    return CrimeAnalyticsService.get_types(
        db,
        category_id=category_id,
        state_id=state_id,
        district_id=district_id,
        start_date=start_date,
        end_date=end_date,
    )


@router.get(
    "/hourly",
    response_model=HourlyDistributionResponse,
    summary="Get Hourly Crime Distribution",
    description="Analyze incident frequency across 24 hours to determine peak crime hours for police patrol scheduling.",
)
def get_hourly(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    db: Session = Depends(get_db),
) -> HourlyDistributionResponse:
    return CrimeAnalyticsService.get_hourly(db, state_id=state_id, district_id=district_id)


@router.get(
    "/demographics",
    response_model=VictimDemographicsResponse,
    summary="Get Victim Demographics Breakdown",
    description="Retrieve victim age cohort distribution, average age, and gender-disaggregated statistics.",
)
def get_demographics(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    db: Session = Depends(get_db),
) -> VictimDemographicsResponse:
    return CrimeAnalyticsService.get_victim_demographics(db, state_id=state_id, district_id=district_id)


@router.get(
    "/weapons",
    response_model=WeaponDistributionResponse,
    summary="Get Weapon Involvement Distribution",
    description="Analyze crime incident frequency by weapon classification (Firearm, Knife, Blunt Object, Explosives, Poison, Other).",
)
def get_weapons(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    db: Session = Depends(get_db),
) -> WeaponDistributionResponse:
    return CrimeAnalyticsService.get_weapons(db, state_id=state_id, district_id=district_id)


@router.get(
    "/top-districts",
    response_model=TopDistrictsResponse,
    summary="Get Top Crime-Prone Districts",
    description="Rank districts by absolute incident volume or per-capita crime rate (crimes per 100,000 citizens) using Census population.",
)
def get_top_districts(
    metric: str = Query("volume", pattern="^(volume|rate)$", description="Ranking metric: 'volume' (absolute count) or 'rate' (crimes per 100k)"),
    limit: int = Query(10, ge=1, le=100, description="Number of districts to return"),
    state_id: Optional[int] = Query(None, description="Filter within State ID"),
    db: Session = Depends(get_db),
) -> TopDistrictsResponse:
    return CrimeAnalyticsService.get_top_districts(db, metric=metric, limit=limit, state_id=state_id)
