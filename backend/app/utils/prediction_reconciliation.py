"""
Largest-Remainder (Hamilton-Hare) Allocation Method for Integer Prediction Reconciliations.
Ensures that decomposed compositional predictions (e.g., categories or crime types)
sum exactly to the nearest-integer rounded total forecast without off-by-one errors.
"""

import math
from typing import List, Dict, Any, TypeVar

T = TypeVar("T", bound=Dict[str, Any])


def largest_remainder_allocation(values: List[float], target_total: int) -> List[int]:
    """
    Applies the Largest-Remainder Method to convert a list of non-negative float values
    into integers such that sum(integers) == target_total.
    """
    if not values:
        return []

    target_total = max(0, int(round(target_total)))
    raw_sum = sum(max(0.0, float(v)) for v in values)

    if target_total == 0 or raw_sum <= 0:
        return [0] * len(values)

    # Scale values to target_total
    scaled = [(max(0.0, float(v)) / raw_sum) * target_total for v in values]
    floors = [int(math.floor(s)) for s in scaled]
    remainders = [(i, scaled[i] - floors[i], float(values[i])) for i in range(len(values))]

    # Distribute remaining units to largest remainders
    sum_floors = sum(floors)
    units_to_distribute = target_total - sum_floors

    # Sort remainders descending by remainder, then original value, then index
    remainders.sort(key=lambda r: (-r[1], -r[2], r[0]))

    result = list(floors)
    for i in range(min(units_to_distribute, len(remainders))):
        idx = remainders[i][0]
        result[idx] += 1

    return result


def reconcile_category_predictions(
    items: List[T],
    target_total: float,
    count_key: str = "predicted_count",
    output_key: str = "display_predicted_count",
) -> List[T]:
    """
    Reconciles a list of dictionaries containing `count_key` with `target_total`,
    assigning the integer-allocated count to `output_key`.
    """
    if not items:
        return []

    target_int = int(round(target_total))
    raw_vals = [float(it.get(count_key) or 0.0) for it in items]
    allocated = largest_remainder_allocation(raw_vals, target_int)

    for i, it in enumerate(items):
        it[output_key] = allocated[i]

    return items
