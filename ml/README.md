# Machine Learning Pipeline Architecture

This module isolates the machine learning workflows from the web application API layer.

## Directory Layout

- `data/`: Local storage for training data snapshots or processed arrays (ignored by git).
- `preprocessing/`: Scripts for data transformation, missing value imputation, and encoding.
- `feature_engineering/`: Feature extraction, lag features, rolling statistics, and temporal features.
- `training/`: Model training scripts with cross-validation.
- `evaluation/`: Metrics computation (MAE, RMSE, R2, classification report) and SHAP explainability analysis.
- `inference/`: Service-facing prediction wrappers to load models and output inference results.
- `saved_models/`: Serialized model artifacts (`.joblib`, `.pkl`) tracked outside version control.

> [!NOTE]
> ML models are NOT implemented in Phase 1. Implementation starts in Phase 9.
