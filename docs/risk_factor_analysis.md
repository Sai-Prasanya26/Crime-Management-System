# Empirical Risk Factor Analysis & Statistical Investigation

**Project**: Data-Driven Crime Management System with AI-Based Resource Optimization  
**Phase**: Phase 9A — Risk Assessment Architecture & Scoring Methodology  
**Dataset Scope**: Complete 2020–2025 Historical Panel ($191,679$ Incidents) + Census 2011 Baseline Demographics ($640$ Historical Districts) + Phase 8D Production Forecasts ($8,320$ Predictions)

---

## 1. Executive Summary

This exploratory data analysis establishes the empirical foundation for the Crime Risk Assessment engine. Rather than selecting arbitrary weights or assumptions, candidate risk factors were extracted directly from the verified MySQL database and feature pipeline, and evaluated across:
1. **Descriptive moments** (Mean, Standard Deviation, Quantiles, Skewness, Kurtosis)
2. **Collinearity and correlation structure** (Pearson linear and Spearman rank-order correlations)
3. **Outlier impact** (Large metropolitan volume hubs vs. low-population rural per-capita rate spikes)
4. **Alternative normalization methods** (Linear Min-Max vs. Winsorized Scaling vs. Percentile Rank Normalization)

---

## 2. Descriptive Statistics of Candidate Factors across 640 Districts

All values reflect actual ground-truth data from the 640 historical Census districts in 2025:

| Candidate Factor | Unit | Mean | Std | Min | 25% | Median | 75% | Max | Skewness | Kurtosis |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Annual Volume (2025)** ($V$) | Incidents / Year | 55.24 | 35.01 | 8.00 | 29.75 | 47.50 | 73.00 | 239.00 | 1.60 | 4.05 |
| **Forecast Volume (2026-01)** ($F$) | Incidents / Month | 4.37 | 2.71 | 1.28 | 2.48 | 3.76 | 5.49 | 18.71 | 1.76 | 4.71 |
| **Census 2011 Population** | Citizens | 1,891,961 | 1,544,380 | 8,004 | 817,861 | 1,557,367 | 2,583,551 | 11,060,148 | 1.82 | 5.66 |
| **Annual Crime Rate** ($R$) | Incidents / 100k pop | 4.76 | 6.67 | 1.48 | 2.63 | 3.14 | 4.00 | 99.95 | **7.49** | **79.77** |
| **Recent 3-Month Volume** | Oct–Dec 2025 | 13.76 | 9.22 | 0.00 | 7.00 | 12.00 | 18.00 | 63.00 | 1.51 | 3.57 |
| **Prior 3-Month Volume** | Jul–Sep 2025 | 14.52 | 9.93 | 0.00 | 7.00 | 12.50 | 19.00 | 61.00 | 1.52 | 3.22 |
| **Trend Ratio (3-Month)** ($T$) | $V_{\text{rec}} / (V_{\text{pri}} + 1)$ | 0.95 | 0.45 | 0.00 | 0.67 | 0.90 | 1.11 | 3.67 | 1.94 | 7.63 |
| **Mean Severity Weight** ($S$) | Category Weight | 1.15 | 0.05 | 1.00 | 1.12 | 1.15 | 1.19 | 1.34 | 0.32 | 0.11 |
| **Violent Crime Ratio** | Ratio ($0\text{--}1$) | 0.27 | 0.11 | 0.00 | 0.19 | 0.26 | 0.33 | 0.67 | 0.40 | 0.17 |

---

## 3. Correlation Structure & Double-Counting Investigation

### A. Pearson Linear Correlation Matrix:

| | Annual Vol ($V$) | Forecast Vol ($F$) | Crime Rate ($R$) | Trend Ratio ($T$) | Mean Severity ($S$) | Total Population |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Annual Vol ($V$)** | **1.0000** | 0.9857 | -0.2976 | -0.0017 | -0.0244 | 0.9446 |
| **Forecast Vol ($F$)** | **0.9857** | **1.0000** | -0.3093 | -0.0060 | -0.0175 | 0.9742 |
| **Crime Rate ($R$)** | -0.2976 | -0.3093 | **1.0000** | -0.0180 | 0.0070 | -0.3380 |
| **Trend Ratio ($T$)** | -0.0017 | -0.0060 | -0.0180 | **1.0000** | -0.0697 | -0.0117 |
| **Mean Severity ($S$)** | -0.0244 | -0.0175 | 0.0070 | -0.0697 | **1.0000** | -0.0079 |
| **Total Population** | 0.9446 | 0.9742 | -0.3380 | -0.0117 | -0.0079 | **1.0000** |

### B. Spearman Rank-Order Correlation Matrix:

| | Annual Vol ($V$) | Forecast Vol ($F$) | Crime Rate ($R$) | Trend Ratio ($T$) | Mean Severity ($S$) | Total Population |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Annual Vol ($V$)** | **1.0000** | 0.9798 | -0.4897 | 0.1031 | -0.0346 | 0.9433 |
| **Forecast Vol ($F$)** | **0.9798** | **1.0000** | -0.6246 | 0.0877 | -0.0299 | 0.9847 |
| **Crime Rate ($R$)** | -0.4897 | -0.6246 | **1.0000** | -0.0112 | -0.0290 | -0.7309 |
| **Trend Ratio ($T$)** | 0.1031 | 0.0877 | -0.0112 | **1.0000** | -0.0669 | 0.0763 |
| **Mean Severity ($S$)** | -0.0346 | -0.0299 | -0.0290 | -0.0669 | **1.0000** | -0.0214 |
| **Total Population** | 0.9433 | 0.9847 | -0.7309 | 0.0763 | -0.0214 | **1.0000** |

---

## 4. Key Empirical Insights

### Insight 1: Extreme Multi-Collinearity between Historical Volume and Forecast Volume
- Pearson correlation between $V$ and $F$ is **0.9857** (Spearman rank: **0.9798**).
- Both factors are heavily correlated with total population ($r = 0.9446$ and $r = 0.9742$).
- **Methodological Impact**: Assigning large separate weights to both (e.g. 40% Volume + 40% Forecast) would create an 80% redundant scale factor that simply mirrors population size.
- **Resolution**: Combine them conceptually into the **Scale & Operational Demand Dimension** with a combined total weight of **50%** (30% Forecast + 20% Historical Baseline).

### Insight 2: The Small-Population Denominator Distortion in Crime Rates
- While median crime rate is **3.14 incidents per 100k citizens**, the maximum reaches **99.95 per 100k** (in Dibang Valley, population 8,004 with 8 incidents).
- The skewness of the crime rate is **7.49**, with a kurtosis of **79.77**.
- **Negative Correlation with Population**: Pearson $r = -0.3380$, Spearman $r = -0.7309$. Smaller districts systematically exhibit higher per-capita rates.
- **Methodological Impact**: Linear Min-Max scaling on crime rate is unusable because 75% of districts would have a normalized score $< 2.6\%$, squashing 600+ districts. Percentile rank normalization or clipped Winsorization is mandatory.

### Insight 3: Orthogonality of the Recent Temporal Trend
- Correlation between the 3-month trend ratio ($T$) and Annual Volume is **-0.0017**; with Forecast is **-0.0060**; with Population is **-0.0117**.
- **Methodological Impact**: The trend factor introduces **completely independent, orthogonal information**. It measures pure velocity (acceleration vs. deceleration) regardless of district size or geographical scale.

### Insight 4: Severity & Crime Category Invariance
- `mean_severity_weight` across all 640 districts has a tiny standard deviation (**0.0526** around a mean of **1.1544**).
- The category composition of crime across districts is remarkably uniform (~60% Other, ~27% Violent, ~9% Fire, ~4% Traffic).
- Furthermore, the production forecasting model predicts total volume, not category-level breakdown.
- **Methodological Impact**: Incorporating an un-forecasted, low-variance historical severity index adds noise without meaningful risk discrimination. As recommended by Section 12, severity is documented and tracked in schema as an auxiliary audit index, but excluded from the primary composite risk score.

---

## 5. Comparative Evaluation of Normalization Techniques

We tested three normalization methods across the 640 districts:

| Method | Formula | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Linear Min-Max** | $z = \frac{x - x_{\min}}{x_{\max} - x_{\min}} \times 100$ | Simple, preserves linear proportionality | **Severe outlier compression**: On crime rates (Kurtosis 79.8), 95% of districts are compressed below score 5.0 |
| **Winsorized Min-Max (p1–p99)** | $z = \frac{\text{clip}(x, p_1, p_{99}) - p_1}{p_{99} - p_1} \times 100$ | Limits extreme outlier leverage | Mean is artificially shifted to ~25; arbitrary clipping threshold selection |
| **Percentile Rank Normalization** | $z = \frac{\text{Rank}(x) - 1}{N - 1} \times 100$ | **Uniform [0, 100] distribution**: Skewness = 0.0, Mean = 50.0, Std = 28.9. Perfectly immune to extreme rate spikes; equal dynamic range across all factors | Non-linear: rank difference of 1 incident in low-volume areas has same rank step as 1 incident in high-volume areas |

### Decision:
**Percentile Rank Normalization** is selected as the primary methodology. It guarantees that every factor operates on an identical $[0, 100]$ scale with equal variance, preventing mega-cities from monopolizing volume scores and preventing remote hill districts from monopolizing rate scores.

---

## 6. Outlier District Profiles: The Need for Balanced Dimensions

| Archetype | District (State) | Population | Annual Vol | Forecast | Rate / 100k | Trend Ratio | Pure Vol Rank | Pure Rate Rank | Balanced Score |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Urban Mega-Hub** | Thane (Maharashtra) | 11,060,148 | 239.0 | 18.71 | 2.16 | 1.02 | **100.0%** | **9.4%** | **66.58** (High) |
| **Remote Sparse** | Dibang Valley (Arunachal Pradesh) | 8,004 | 8.0 | 1.29 | 99.95 | 0.33 | **0.2%** | **100.0%** | **31.45** (Moderate) |
| **Emerging Surge** | Chatra (Jharkhand) | 1,042,886 | 28.0 | 2.50 | 2.68 | 3.67 | **22.9%** | **28.0%** | **40.63** (Moderate) |
| **Multi-Peak Risk** | Alwar (Rajasthan) | 3,674,179 | 115.0 | 9.30 | 3.13 | 1.42 | **94.2%** | **49.7%** | **80.56** (Critical) |
| **Stable Low-Risk** | Fatehgarh Sahib (Punjab) | 600,163 | 12.0 | 1.65 | 2.00 | 0.17 | **2.0%** | **5.2%** | **5.14** (Low) |

### Key Takeaway:
Under our balanced multi-dimensional methodology:
- Thane is recognized as High Risk due to massive operational demand, but tempered from an extreme score by low per-capita victimization.
- Dibang Valley is recognized as Moderate Risk despite having the highest rate in India, because its absolute incident volume is only 8 crimes.
- Alwar achieves Critical Risk because it faces both high volume (94th percentile), high forecast pressure (96th percentile), and an accelerating trend (90th percentile).
