-- ============================================================
-- Data-Driven Crime Management System with AI-Based Resource Optimization
-- Phase 3A: Frozen MySQL Relational Database Schema
-- Database: crime_management_db (MySQL 8.0, InnoDB, utf8mb4)
-- Exactly 17 Normalized Tables
-- ============================================================

CREATE DATABASE IF NOT EXISTS `crime_management_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `crime_management_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- Table structure for table `states`
DROP TABLE IF EXISTS `states`;
CREATE TABLE `states` (
  `id` int NOT NULL AUTO_INCREMENT,
  `state_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `state_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_type` enum('STATE','UT') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'STATE',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_states_state_name` (`state_name`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `districts`
DROP TABLE IF EXISTS `districts`;
CREATE TABLE `districts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `state_id` int NOT NULL,
  `district_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `census_district_code` int DEFAULT NULL,
  `lgd_code` int DEFAULT NULL,
  `is_census_2011` tinyint(1) NOT NULL DEFAULT '0',
  `is_current_admin` tinyint(1) NOT NULL DEFAULT '1',
  `parent_district_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_state_district` (`state_id`,`district_name`),
  UNIQUE KEY `census_district_code` (`census_district_code`),
  KEY `ix_districts_state_id` (`state_id`),
  KEY `ix_districts_district_name` (`district_name`),
  KEY `fk_districts_parent` (`parent_district_id`),
  CONSTRAINT `districts_ibfk_1` FOREIGN KEY (`state_id`) REFERENCES `states` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_districts_parent` FOREIGN KEY (`parent_district_id`) REFERENCES `districts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=802 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `district_demographics`
DROP TABLE IF EXISTS `district_demographics`;
CREATE TABLE `district_demographics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `district_id` int NOT NULL,
  `census_year` smallint NOT NULL,
  `total_population` bigint NOT NULL,
  `male_population` bigint NOT NULL,
  `female_population` bigint NOT NULL,
  `literate_population` bigint NOT NULL,
  `total_workers` bigint NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `district_id` (`district_id`),
  CONSTRAINT `district_demographics_ibfk_1` FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=641 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `crime_categories`
DROP TABLE IF EXISTS `crime_categories`;
CREATE TABLE `crime_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity_weight` decimal(3,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_name` (`category_name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `crime_types`
DROP TABLE IF EXISTS `crime_types`;
CREATE TABLE `crime_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `crime_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `crime_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity_level` enum('LOW','MEDIUM','HIGH','CRITICAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `crime_code` (`crime_code`),
  KEY `ix_crime_types_category_id` (`category_id`),
  CONSTRAINT `crime_types_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `crime_categories` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `crime_incidents`
DROP TABLE IF EXISTS `crime_incidents`;
CREATE TABLE `crime_incidents` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `report_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `district_id` int NOT NULL,
  `crime_type_id` int NOT NULL,
  `incident_date` date NOT NULL,
  `incident_time` time NOT NULL,
  `reported_date` date NOT NULL,
  `victim_age` smallint DEFAULT NULL,
  `victim_gender` enum('M','F','OTHER','UNKNOWN') COLLATE utf8mb4_unicode_ci NOT NULL,
  `weapon_used` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `police_deployed_count` smallint NOT NULL,
  `case_status` enum('OPEN','CLOSED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `closed_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `report_number` (`report_number`),
  KEY `ix_crime_incidents_district_id` (`district_id`),
  KEY `ix_crime_incidents_incident_date` (`incident_date`),
  KEY `idx_incident_district_date` (`district_id`,`incident_date`),
  KEY `idx_incident_type_date` (`crime_type_id`,`incident_date`),
  KEY `ix_crime_incidents_crime_type_id` (`crime_type_id`),
  CONSTRAINT `crime_incidents_ibfk_1` FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `crime_incidents_ibfk_2` FOREIGN KEY (`crime_type_id`) REFERENCES `crime_types` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=191680 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `resource_types`
DROP TABLE IF EXISTS `resource_types`;
CREATE TABLE `resource_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `resource_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit_of_measure` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `resource_name` (`resource_name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `resource_costs`
DROP TABLE IF EXISTS `resource_costs`;
CREATE TABLE `resource_costs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `resource_type_id` int NOT NULL,
  `unit_cost` decimal(12,2) NOT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `ix_resource_costs_resource_type_id` (`resource_type_id`),
  KEY `idx_cost_resource_active` (`resource_type_id`,`is_active`),
  CONSTRAINT `resource_costs_ibfk_1` FOREIGN KEY (`resource_type_id`) REFERENCES `resource_types` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `district_resources`
DROP TABLE IF EXISTS `district_resources`;
CREATE TABLE `district_resources` (
  `id` int NOT NULL AUTO_INCREMENT,
  `district_id` int NOT NULL,
  `resource_type_id` int NOT NULL,
  `available_quantity` int NOT NULL,
  `period_year` smallint NOT NULL,
  `period_month` smallint NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_district_resource_period` (`district_id`,`resource_type_id`,`period_year`,`period_month`),
  KEY `resource_type_id` (`resource_type_id`),
  CONSTRAINT `district_resources_ibfk_1` FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `district_resources_ibfk_2` FOREIGN KEY (`resource_type_id`) REFERENCES `resource_types` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `ml_models`
DROP TABLE IF EXISTS `ml_models`;
CREATE TABLE `ml_models` (
  `id` int NOT NULL AUTO_INCREMENT,
  `model_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `algorithm` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `evaluation_metrics` json NOT NULL,
  `training_date` datetime NOT NULL,
  `dataset_snapshot` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `artifact_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_model_name_version` (`model_name`,`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `crime_predictions`
DROP TABLE IF EXISTS `crime_predictions`;
CREATE TABLE `crime_predictions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `district_id` int NOT NULL,
  `crime_type_id` int DEFAULT NULL,
  `model_id` int NOT NULL,
  `prediction_date` date NOT NULL,
  `predicted_crime_count` decimal(10,2) NOT NULL,
  `confidence_lower` decimal(10,2) DEFAULT NULL,
  `confidence_upper` decimal(10,2) DEFAULT NULL,
  `generated_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `crime_type_id` (`crime_type_id`),
  KEY `model_id` (`model_id`),
  KEY `ix_crime_predictions_prediction_date` (`prediction_date`),
  KEY `idx_pred_dist_date` (`district_id`,`prediction_date`),
  CONSTRAINT `crime_predictions_ibfk_1` FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `crime_predictions_ibfk_2` FOREIGN KEY (`crime_type_id`) REFERENCES `crime_types` (`id`) ON DELETE SET NULL,
  CONSTRAINT `crime_predictions_ibfk_3` FOREIGN KEY (`model_id`) REFERENCES `ml_models` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `crime_risk_scores`
DROP TABLE IF EXISTS `crime_risk_scores`;
CREATE TABLE `crime_risk_scores` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `district_id` int NOT NULL,
  `period_year` smallint NOT NULL,
  `period_month` smallint NOT NULL,
  `overall_risk_score` decimal(5,2) NOT NULL,
  `risk_level` enum('LOW','MODERATE','HIGH','CRITICAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity_index` decimal(5,2) NOT NULL,
  `trend_index` decimal(5,2) NOT NULL,
  `volume_index` decimal(5,2) NOT NULL,
  `population_density_factor` decimal(5,2) NOT NULL,
  `calculation_version` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `generated_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_district_risk_period` (`district_id`,`period_year`,`period_month`),
  KEY `idx_risk_period` (`period_year`,`period_month`,`overall_risk_score`),
  CONSTRAINT `crime_risk_scores_ibfk_1` FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `resource_recommendations`
DROP TABLE IF EXISTS `resource_recommendations`;
CREATE TABLE `resource_recommendations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `district_id` int NOT NULL,
  `resource_type_id` int NOT NULL,
  `period_year` smallint NOT NULL,
  `period_month` smallint NOT NULL,
  `available_quantity` int NOT NULL,
  `recommended_quantity` int NOT NULL,
  `shortfall_quantity` int NOT NULL,
  `optimization_rationale` text COLLATE utf8mb4_unicode_ci,
  `model_id` int DEFAULT NULL,
  `generated_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_district_resource_recom_period` (`district_id`,`resource_type_id`,`period_year`,`period_month`),
  KEY `resource_type_id` (`resource_type_id`),
  KEY `model_id` (`model_id`),
  KEY `idx_recom_period` (`district_id`,`period_year`,`period_month`),
  CONSTRAINT `resource_recommendations_ibfk_1` FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `resource_recommendations_ibfk_2` FOREIGN KEY (`resource_type_id`) REFERENCES `resource_types` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `resource_recommendations_ibfk_3` FOREIGN KEY (`model_id`) REFERENCES `ml_models` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `budget_estimations`
DROP TABLE IF EXISTS `budget_estimations`;
CREATE TABLE `budget_estimations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `district_id` int NOT NULL,
  `resource_type_id` int NOT NULL,
  `period_year` smallint NOT NULL,
  `period_month` smallint NOT NULL,
  `recommended_units` int NOT NULL,
  `unit_cost` decimal(12,2) NOT NULL,
  `estimated_total_cost` decimal(14,2) NOT NULL,
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cost_config_id` int NOT NULL,
  `generated_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_district_budget_period` (`district_id`,`resource_type_id`,`period_year`,`period_month`),
  KEY `resource_type_id` (`resource_type_id`),
  KEY `cost_config_id` (`cost_config_id`),
  CONSTRAINT `budget_estimations_ibfk_1` FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `budget_estimations_ibfk_2` FOREIGN KEY (`resource_type_id`) REFERENCES `resource_types` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `budget_estimations_ibfk_3` FOREIGN KEY (`cost_config_id`) REFERENCES `resource_costs` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `users`
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('ADMIN','ANALYST','OFFICER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_users_username` (`username`),
  UNIQUE KEY `ix_users_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `audit_logs`
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `idx_audit_user_date` (`user_id`,`created_at`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `generated_reports`
DROP TABLE IF EXISTS `generated_reports`;
CREATE TABLE `generated_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `report_title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_type` enum('DISTRICT_INTELLIGENCE','RESOURCE_OPTIMIZATION','BUDGET_ESTIMATION','EXECUTIVE_SUMMARY') COLLATE utf8mb4_unicode_ci NOT NULL,
  `generated_by_user_id` int NOT NULL,
  `district_id` int DEFAULT NULL,
  `period_year` smallint NOT NULL,
  `period_month` smallint DEFAULT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size_bytes` int NOT NULL,
  `generated_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `generated_by_user_id` (`generated_by_user_id`),
  KEY `district_id` (`district_id`),
  KEY `idx_report_type_period` (`report_type`,`period_year`,`period_month`),
  CONSTRAINT `generated_reports_ibfk_1` FOREIGN KEY (`generated_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `generated_reports_ibfk_2` FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `district_geography_mapping`
DROP TABLE IF EXISTS `district_geography_mapping`;
CREATE TABLE `district_geography_mapping` (
  `id` int NOT NULL AUTO_INCREMENT,
  `historical_district_id` int NOT NULL,
  `current_district_id` int NOT NULL,
  `mapping_type` enum('SAME','SPLIT','MERGED','TRANSFERRED','RENAMED','REORGANIZED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `mapping_percentage` decimal(5,2) DEFAULT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `source` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_dgm_historical` (`historical_district_id`),
  KEY `ix_dgm_current` (`current_district_id`),
  CONSTRAINT `fk_dgm_current` FOREIGN KEY (`current_district_id`) REFERENCES `districts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dgm_historical` FOREIGN KEY (`historical_district_id`) REFERENCES `districts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1182 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `official_crime_statistics`
DROP TABLE IF EXISTS `official_crime_statistics`;
CREATE TABLE `official_crime_statistics` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `state_id` int DEFAULT NULL,
  `district_id` int DEFAULT NULL,
  `report_year` smallint NOT NULL,
  `geography_level` enum('NATIONAL','STATE','DISTRICT','CITY') COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `crime_head` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `crime_category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reported_cases` int NOT NULL,
  `chargesheeted_cases` int DEFAULT NULL,
  `chargesheet_rate` decimal(5,2) DEFAULT NULL,
  `conviction_rate` decimal(5,2) DEFAULT NULL,
  `source_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_report` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `publication_date` date DEFAULT NULL,
  `data_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OFFICIAL_PUBLISHED',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_ocs_year` (`report_year`),
  KEY `ix_ocs_geo_level` (`geography_level`),
  KEY `ix_ocs_state_id` (`state_id`),
  KEY `fk_ocs_district` (`district_id`),
  CONSTRAINT `fk_ocs_district` FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ocs_state` FOREIGN KEY (`state_id`) REFERENCES `states` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
