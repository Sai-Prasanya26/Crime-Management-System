/**
 * Universal Prediction Presentation & Largest-Remainder Reconciliation Utilities.
 * Formats machine learning crime forecasts as clean integer incident counts across
 * dashboards, breakdown tables, risk panels, optimization views, and reporting exports.
 */

/**
 * Formats a predicted continuous incident count using standard nearest-integer rounding.
 * Retains unrounded underlying values for analytical calculations.
 */
export function formatPredictedCount(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  const rounded = Math.round(value);
  return rounded.toLocaleString();
}

/**
 * Returns integer value of a prediction using standard nearest-integer rounding.
 */
export function roundPredictedCount(value: number | null | undefined): number {
  if (value === null || value === undefined || isNaN(value)) {
    return 0;
  }
  return Math.round(value);
}

/**
 * Formats prediction intervals using floor for the lower bound and ceiling for the upper bound.
 * E.g., lower = 4.21, upper = 11.08 -> "[4 – 12]"
 */
export function formatPredictionInterval(
  lower: number | null | undefined,
  upper: number | null | undefined
): string {
  if (
    lower === null ||
    lower === undefined ||
    isNaN(lower) ||
    upper === null ||
    upper === undefined ||
    isNaN(upper)
  ) {
    return '—';
  }
  const floorLower = Math.max(0, Math.floor(lower));
  const ceilUpper = Math.max(floorLower, Math.ceil(upper));
  return `[${floorLower.toLocaleString()} – ${ceilUpper.toLocaleString()}]`;
}

/**
 * Reconciles an array of category or crime-type forecast items with a target integer total
 * using the Largest-Remainder Method (Hamilton-Hare algorithm).
 * 
 * Guarantees:
 * 1. Every category/type receives an integer count.
 * 2. The sum of all displayed integer counts EXACTLY equals the rounded total prediction.
 * 3. Proportions closely match original unrounded continuous model distributions.
 * 
 * @param items - Array of items containing a numerical `predicted_count`
 * @param explicitTargetTotal - Optional target total. If omitted, uses Math.round(sum of item counts).
 */
export function reconcilePredictionsWithLargestRemainder<
  T extends { predicted_count?: number | null }
>(
  items: T[],
  explicitTargetTotal?: number | null
): (T & { integer_count: number; display_count: string })[] {
  if (!items || items.length === 0) {
    return [];
  }

  // Determine target integer total
  const rawSum = items.reduce((acc, it) => acc + Math.max(0, it.predicted_count || 0), 0);
  const targetTotal =
    explicitTargetTotal !== null && explicitTargetTotal !== undefined && !isNaN(explicitTargetTotal)
      ? Math.max(0, Math.round(explicitTargetTotal))
      : Math.max(0, Math.round(rawSum));

  if (targetTotal === 0 || rawSum <= 0) {
    return items.map((it) => ({
      ...it,
      integer_count: 0,
      display_count: '0',
    }));
  }

  // Step 1: Scale raw counts so they sum exactly to targetTotal
  const normalizedValues = items.map((it) => {
    const rawVal = Math.max(0, it.predicted_count || 0);
    return (rawVal / rawSum) * targetTotal;
  });

  // Step 2: Compute integer floors and fractional remainders
  const floors = normalizedValues.map((v) => Math.floor(v));
  const remainders = normalizedValues.map((v, i) => ({
    index: i,
    remainder: v - floors[i],
    originalValue: Math.max(0, items[i].predicted_count || 0),
  }));

  // Step 3: Determine units remaining to be allocated
  const sumFloors = floors.reduce((acc, f) => acc + f, 0);
  let unitsToDistribute = targetTotal - sumFloors;

  // Step 4: Sort remainders descending (tie-break by larger original value, then stable index)
  remainders.sort((a, b) => {
    if (Math.abs(b.remainder - a.remainder) > 1e-9) {
      return b.remainder - a.remainder;
    }
    if (Math.abs(b.originalValue - a.originalValue) > 1e-9) {
      return b.originalValue - a.originalValue;
    }
    return a.index - b.index;
  });

  // Step 5: Assign +1 to the highest remainders
  const resultAllocations = [...floors];
  for (let i = 0; i < unitsToDistribute && i < remainders.length; i++) {
    resultAllocations[remainders[i].index] += 1;
  }

  // Handle rare edge-case if sumFloors exceeded targetTotal due to precision
  if (unitsToDistribute < 0) {
    let excess = Math.abs(unitsToDistribute);
    // Sort remainders ascending to subtract from lowest remainders with floor > 0
    const ascRemainders = [...remainders].reverse();
    for (const r of ascRemainders) {
      if (excess <= 0) break;
      if (resultAllocations[r.index] > 0) {
        resultAllocations[r.index] -= 1;
        excess -= 1;
      }
    }
  }

  return items.map((it, idx) => {
    const intCount = resultAllocations[idx];
    return {
      ...it,
      integer_count: intCount,
      display_count: intCount.toLocaleString(),
    };
  });
}
