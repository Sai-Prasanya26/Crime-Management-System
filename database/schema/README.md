# Phase 3A: Frozen MySQL Database Schema

This directory contains the database initialization tools and authoritative DDL statements for the **Data-Driven Crime Management System with AI-Based Resource Optimization**.

## Files in this Directory

- **`schema.sql`**: Production-grade MySQL DDL script containing the complete table definitions, foreign keys, unique constraints, and indexes for all 17 tables.
- **`init_db.py`**: Python execution script leveraging SQLAlchemy 2.0 (`Base.metadata.create_all`) to initialize the database programmatically from `.env` configuration.
- **`dump_schema.py`**: Utility script that extracts the active table structures directly from MySQL.

## Database Information

- **Database Name**: `crime_management_db`
- **Engine**: InnoDB
- **Character Set**: `utf8mb4`
- **Collation**: `utf8mb4_unicode_ci`
- **Total Tables**: Exactly 17 Normalized Tables

## Table Manifest

1. `states`
2. `districts`
3. `district_demographics`
4. `crime_categories`
5. `crime_types`
6. `crime_incidents`
7. `resource_types`
8. `resource_costs`
9. `district_resources`
10. `ml_models`
11. `crime_predictions`
12. `crime_risk_scores`
13. `resource_recommendations`
14. `budget_estimations`
15. `users`
16. `audit_logs`
17. `generated_reports`

All tables currently contain 0 records, ready for the Phase 3B data cleaning and ingestion pipeline.
