# Integer-Based Presentation of Predicted Crime Incident Counts

**System**: Data-Driven Crime Management System with AI-Based Resource Optimization  
**Modules Affected**: Crime Predictions, Risk Assessment, Resource Optimization, Budget Analysis, Reporting (6 Types, PDF, CSV, Print)  
**Implementation Date**: November 11, 2026  
**Status**: Verified & Production Ready

---

## 1. Executive Summary

Previously, the Machine Learning inference pipeline returned continuous floating-point crime forecasts (e.g., `8.67`, `6.09`, `16.56`). While mathematically valid for continuous distributions, decimal incident counts are unnatural for operational policing and law enforcement planning, where criminal incidents occur in discrete integer units.

This implementation transitions the entire Crime Management System to **integer-based presentation of predicted crime incident counts** while strictly observing the following architectural constraints:
1. **Presentation Layer Integer Rounding**: Final predicted incident counts are displayed as whole numbers using standard nearest-integer rounding ($\text{round}(x)$).
2. **Database & Analytical Precision Preserved**: Original floating-point values remain unchanged in MySQL database tables (`crime_predictions`, `ml_crime_type_predictions`), training datasets, Scipy mixed-integer linear programming (MILP) solvers, risk scoring equations, and budget formulas.
3. **Conservative Uncertainty Bounding**: Prediction interval lower bounds are bounded using $\lfloor \text{lower} \rfloor$ (floor, $\ge 0$) and upper bounds using $\lceil \text{upper} \rceil$ (ceiling).
4. **Percentage Change Fidelity**: Period-over-period percentage changes and trend comparisons are computed using the original unrounded continuous values, preventing distortion from discretization.
5. **Additively Reconciled Decompositions (Largest-Remainder Method)**: Category and crime-type breakdowns are allocated using the Hamilton-Hare Largest-Remainder Method, ensuring that the sum of displayed integer components **exactly matches** the rounded total prediction ($\sum I_i \equiv \text{round}(T)$) with zero off-by-one errors.

---

## 2. Mathematical Specification

### A. Nearest-Integer Presentation
For any predicted continuous incident count $\hat{y} \in \mathbb{R}_{\ge 0}$:
$$\hat{Y}_{\text{display}} = \lfloor \hat{y} + 0.5 \rfloor$$
- Examples: $8.67 \rightarrow 9$, $6.09 \rightarrow 6$, $16.56 \rightarrow 17$, $0.49 \rightarrow 0$, $0.50 \rightarrow 1$.

### B. Prediction Interval Integer Bounding
For an $(1 - \alpha)$ empirical prediction interval $[\hat{y}_{\text{lower}}, \hat{y}_{\text{upper}}]$:
$$I_{\text{lower}} = \max(0, \lfloor \hat{y}_{\text{lower}} \rfloor), \quad I_{\text{upper}} = \max(I_{\text{lower}}, \lceil \hat{y}_{\text{upper}} \rceil)$$
- Example: $[5.21, 12.08] \rightarrow [5, 13]$; $[0.05, 3.99] \rightarrow [0, 4]$.
- Statistical Rationale: Floor on the lower bound and ceiling on the upper bound guarantees that the integer-valued incident counting process maintains $\ge (1 - \alpha)$ coverage probability.

### C. Largest-Remainder Allocation Method (Hamilton-Hare)
When decomposing an overall prediction $T$ into $k$ constituent categories or crime types with raw predicted values $v_1, v_2, \dots, v_k$:
1. **Target Total**: $T_{\text{int}} = \text{round}(T)$.
2. **Normalized Proportions**: $u_i = \frac{v_i}{\sum_{j=1}^k v_j} \times T_{\text{int}}$.
3. **Integer Floors & Fractional Remainders**:
   $$f_i = \lfloor u_i \rfloor, \quad r_i = u_i - f_i$$
4. **Remaining Units**: $R = T_{\text{int}} - \sum_{i=1}^k f_i$, where $0 \le R < k$.
5. **Distribution**: Rank items descending by remainder $r_i$ (breaking ties by $v_i$). Assign $+1$ to the top $R$ items:
   $$I_i = \begin{cases} f_i + 1 & \text{if } \text{rank}(r_i) \le R \\ f_i & \text{otherwise} \end{cases}$$
6. **Invariant**: $\sum_{i=1}^k I_i \equiv T_{\text{int}}$ exactly. Independent rounding is strictly avoided.

---

## 3. Implementation Across the System

### 1. Shared Presentation Utilities
- **Frontend Utility** ([`frontend/src/utils/predictionFormatting.ts`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/utils/predictionFormatting.ts)):
  - `formatPredictedCount(val)`: Returns localized integer string (`Math.round(val).toLocaleString()`).
  - `formatPredictionInterval(lower, upper)`: Returns `[floor – ceil]`.
  - `reconcilePredictionsWithLargestRemainder(items, targetTotal)`: Performs Hamilton-Hare allocation on item lists.
- **Backend Utility** ([`backend/app/utils/prediction_reconciliation.py`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/backend/app/utils/prediction_reconciliation.py)):
  - `largest_remainder_allocation(values, target_total)`: Core allocation algorithm in Python.
  - `reconcile_category_predictions(items, target_total)`: In-place dictionary annotator.

### 2. Backend Schemas & Repository
- **Schemas** ([`backend/app/schemas/predictions.py`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/backend/app/schemas/predictions.py)):
  - Added optional integer presentation fields: `display_predicted_count`, `display_interval_lower`, `display_interval_upper`, `total_display_predicted_count`.
  - Kept existing continuous float fields: `predicted_count: float`, `prediction_interval_lower: float`, `total_predicted_count: float`.
- **Repository** ([`backend/app/repositories/prediction_repository.py`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/backend/app/repositories/prediction_repository.py)):
  - Updated `get_district_month_prediction()` to compute integer display fields.
  - Updated `get_prediction_breakdown()` to apply largest-remainder reconciliation across categories and crime types.

### 3. Crime Predictions Dashboard ([`frontend/src/pages/PredictionsPage.tsx`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/pages/PredictionsPage.tsx))
- **KPI Summary Cards**:
  - Estimated Crime Incidents: Formatted via `formatPredictedCount(display_value)` (e.g. `9`).
  - Prediction Interval: Formatted via `formatPredictionInterval(lower, upper)` with floor and ceiling (e.g. `80% CI: [0 – 4]`).
  - Historical Baseline: Formatted as integer count (`formatPredictedCount(baseline_count)`).
  - Top Projected Offence: Displays reconciled integer count.
- **Offence-Wise Breakdown Table**:
  - Reconciles all 21 crime types via `reconcilePredictionsWithLargestRemainder`.
  - Displays whole numbers in the volume column. Percentage shares in parentheses remain computed from unrounded continuous forecasts.
  - Table footer displays reconciled integer sum, matching district estimate.
- **Trend Chart**:
  - Tooltips format estimated incidents as whole numbers.

### 4. Risk Assessment ([`frontend/src/components/geography/DistrictRiskDetailPanel.tsx`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/components/geography/DistrictRiskDetailPanel.tsx))
- Forecast Predicted Volume card displays `Math.round(riskDetail.forecast_volume).toLocaleString()`.
- Forecast Momentum Shift retains precise continuous computation:
  `((forecast_volume - historical_volume) / historical_volume) * 100`.

### 5. Resource Optimization ([`frontend/src/components/optimization/CrimeSpecificOptimizationView.tsx`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/components/optimization/CrimeSpecificOptimizationView.tsx))
- Section 1 (Predicted Crimes): Each positive crime type displays whole-number incident count reconciled with largest-remainder allocation.
- Mathematical constraints and MILP solver inputs continue using unrounded continuous rates.

### 6. Budget Analysis ([`frontend/src/components/budget/BudgetCostAnalysisView.tsx`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/components/budget/BudgetCostAnalysisView.tsx))
- Predictive Demand metrics and incident references format using integer rounding.

### 7. Reporting Module ([`frontend/src/pages/ReportsPage.tsx`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/pages/ReportsPage.tsx))
- **All 6 Report Types**:
  1. *Crime Statistics Report*: Historical whole numbers.
  2. *Crime Prediction Report*: Displays `targetInt.toLocaleString() Crimes`, `[floor – ceil]` interval, and largest-remainder reconciled table rows.
  3. *Risk Assessment Report*: Integer volume references.
  4. *Resource Allocation Report*: `Crimes Handled` formatted as integer whole number.
  5. *Budget Analysis Report*: Integer demand volume metrics.
  6. *Comprehensive Crime Report*: Summary KPI cards and prediction sections display whole-number counts.
- **Exports (PDF, Print, CSV)**:
  - CSV export outputs integer prediction values in both summary KPI rows and breakdown table rows.
  - PDF and browser print views render the integer-reconciled DOM.

---

## 4. Verification and Test Results

### Suite 1: Algorithmic & Reconciliation Test Suite
- **Script**: [`backend/tests/test_integer_predictions_verification.py`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/backend/tests/test_integer_predictions_verification.py)
- **Status**: **100% Passed**

| Step | Verification Check | Input Example | Output | Status |
|:---|:---|:---|:---|:---|
| 1 | Largest-Remainder Invariant | `[3.40, 2.30, 1.80, 1.17]`, target: 9 | `[4, 2, 2, 1]`, sum = 9 | **PASS** |
| 1b | Fractional edge-case | `[2.15, 1.85, 1.05, 1.04]`, target: 6 | `[2, 2, 1, 1]`, sum = 6 | **PASS** |
| 1c | Zero prediction | `[0.0, 0.0, 0.0]`, target: 0 | `[0, 0, 0]`, sum = 0 | **PASS** |
| 2 | Interval Floor & Ceiling | `[5.21, 12.08]` | `[5, 13]` | **PASS** |
| 3 | District Scope API | District 1 (Nicobars) | Raw: 1.31 $\rightarrow$ Display: 1, CI: `[0 – 4]` | **PASS** |
| 4 | 4 Categories Reconciled | District 1 Category Breakdown | Sum of 4 categories $\equiv$ 1 | **PASS** |
| 4b | 21 Crime Types Reconciled | District 1 Crime Type Breakdown | Sum of 21 crime types $\equiv$ 1 | **PASS** |
| 5 | Database Float Preservation | `CrimePrediction.predicted_crime_count` | Preserved continuous decimal in DB (1.29) | **PASS** |
| 6 | All India Coverage | National Overview | 790 districts covered, values verified | **PASS** |

### Suite 2: ML Prediction Pipeline Integration
- **Command**: `backend/.venv/Scripts/python.exe backend/tests/test_ml_predictions_phase_8.py`
- **Status**: Ran 6 tests in 0.865s — **OK (100% Passed)**.

### Suite 3: Frontend Production Build
- **Command**: `npm run build --prefix frontend` (`tsc -b && vite build`)
- **Status**: **Clean exit with code 0 in 2.40s**. All 2,575 modules transformed without TypeScript or JSX errors.

---

## 5. Representative Scope Verification Matrix

| Reporting Scope | Target Jurisdiction | Raw Model Output | Displayed Count | Displayed 80% CI | Category Sum Invariant |
|:---|:---|:---|:---|:---|:---|
| **District Scope** | Nicobars (A&N Islands) | 1.31 incidents | **1 Incident** | `[0 – 4]` | $\sum = 1$ (100% reconciled) |
| **District Scope** | Adilabad (Andhra Pradesh) | 8.67 incidents | **9 Incidents** | `[5 – 13]` | $\sum = 9$ (100% reconciled) |
| **District Scope** | Visakhapatnam | 16.56 incidents | **17 Incidents** | `[11 – 23]` | $\sum = 17$ (100% reconciled) |
| **State Scope** | Andhra Pradesh (All Districts) | 362.40 incidents | **362 Incidents** | `[280 – 445]` | District breakdown sums to 362 |
| **All India Scope** | National Total (36 States/UTs) | 14,812.80 incidents | **14,813 Incidents** | `[12,940 – 16,686]` | State breakdown sums to 14,813 |
