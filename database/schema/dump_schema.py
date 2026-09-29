import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.database.session import engine
from sqlalchemy import text

tables = [
    "states",
    "districts",
    "district_demographics",
    "crime_categories",
    "crime_types",
    "crime_incidents",
    "resource_types",
    "resource_costs",
    "district_resources",
    "ml_models",
    "crime_predictions",
    "crime_risk_scores",
    "resource_recommendations",
    "budget_estimations",
    "users",
    "audit_logs",
    "generated_reports"
]

output_sql = os.path.join(os.path.dirname(__file__), "schema.sql")

with engine.connect() as conn:
    with open(output_sql, "w", encoding="utf-8") as f:
        f.write("-- ============================================================\n")
        f.write("-- Data-Driven Crime Management System with AI-Based Resource Optimization\n")
        f.write("-- Phase 3A: Frozen MySQL Relational Database Schema\n")
        f.write("-- Database: crime_management_db (MySQL 8.0, InnoDB, utf8mb4)\n")
        f.write("-- Exactly 17 Normalized Tables\n")
        f.write("-- ============================================================\n\n")
        f.write("CREATE DATABASE IF NOT EXISTS `crime_management_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n")
        f.write("USE `crime_management_db`;\n\n")
        f.write("SET FOREIGN_KEY_CHECKS = 0;\n\n")
        
        for table in tables:
            res = conn.execute(text(f"SHOW CREATE TABLE `{table}`;")).fetchone()
            if res:
                create_stmt = res[1]
                f.write(f"-- Table structure for table `{table}`\n")
                f.write(f"DROP TABLE IF EXISTS `{table}`;\n")
                f.write(create_stmt + ";\n\n")
                
        f.write("SET FOREIGN_KEY_CHECKS = 1;\n")

print(f"Generated clean schema DDL in {output_sql}")
