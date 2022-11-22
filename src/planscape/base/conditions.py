"""Functions for computing conditions."""

import numpy as np
from typing import Optional, cast

from base.condition_types import Condition, ConditionScoreType


def weighted_average_condition(no_data_value: float, conditions_with_weights: list[tuple[Condition, float]]) -> Optional[Condition]:
    """Computes the weighted average condition, ignoring the given NoData value.

    Args:
      no_data_value: The specified NoData value of the original raster. This value will be ignored in calcuation.
      conditions_with_weights: List of Conditions and their weights.  The conditions must have
      the same shape.

    Returns:
      A Condition such that each pixel value is the weighted average of the pixels in the input conditions.
      Output pixels with NoData have the value np.nan.

      Note that a pixel in the input may be nan representing "no value", and that can affect the weights.
      For example, if the condition values at a pixel are 0.5, nan, and 0.25, and the weights are 1, 2, 3,
      then the weighted average will be (0.5 * 1 + 0.25 * 3)/(1 + 3), not divided by (1 + 2 + 3).

    Raises:
      ValueError if the conditions do not have the same shape.
    """
    sum = None
    total_weight = None
    for (condition, weight) in conditions_with_weights:
        # Convert all conditions to float. This allows us to output NoData values as np.nan.
        condition = condition.astype('float32')

        condition_is_nodata = np.isnan(condition) if np.isnan(
            no_data_value) else (condition == no_data_value)
        weighted_path = ~condition_is_nodata * weight
        condition[condition_is_nodata] = np.nan

        if sum is None or total_weight is None:
            sum = np.nan_to_num(condition, nan=0) * weight
            total_weight = weighted_path
        else:
            # Set NoData values to 0, then add condition*weight to rolling sum.
            raw = (np.nan_to_num(sum, nan=0) +
                   np.nan_to_num(condition, nan=0) * weight)
            # Masked array is True if both sum and condition arrays have NoData value.
            raw = np.ma.masked_array(raw, np.isnan(sum)) & condition_is_nodata
            # Set True value to Nan.
            sum = np.ma.filled(raw, no_data_value)
            total_weight = total_weight + weighted_path
    if sum is None or total_weight is None:
        return None
    with np.errstate(divide='ignore', invalid='ignore'):
        return cast(Condition, sum / total_weight)


def average_condition(no_data_value: float, conditions: list[Condition]) -> Optional[Condition]:
    """Computes the (unweighted) average condition.

    Args:
      conditions: List of Conditions.  The conditions must have the same shape.

    Returns:
      A Condition such that each pixel value is the average of the pixels in the input conditions.

    Raises:
      ValueError if the conditions do not have the same shape.
    """
    return weighted_average_condition(no_data_value, list(zip(conditions, [1.0] * len(conditions))))


def management_condition(current: Condition, future: Condition, type: ConditionScoreType) -> Condition:
    """Computes a management condition from the current and future conditions.

    See the PROMOTe framework for the meanings of these condition.

    Args:
      current: The current Condition.
      future: The future Condition.
      type: The type of management condition to compute.

    Returns:
      The desired management Condition.

    Raises:
      ValueError if the conditions do not have the same shape.
    """
    def scaled_distance(x: int, y: int) -> Condition:
        root2 = np.sqrt(2)
        distance = np.sqrt((current - x) * (current - x) +
                           (future - y) * (future - y))
        return (root2 - distance) / root2

    match type:
        case ConditionScoreType.CURRENT:
            return current
        case ConditionScoreType.FUTURE:
            return future
        case ConditionScoreType.ADAPT:
            return scaled_distance(-1, 1)
        case ConditionScoreType.MONITOR:
            return scaled_distance(1, 1)
        case ConditionScoreType.PROTECT:
            return scaled_distance(1, -1)
        case ConditionScoreType.TRANSFORM:
            return scaled_distance(-1, -1)
        case ConditionScoreType.IMPACT:
            adapt = management_condition(
                current, future, ConditionScoreType.ADAPT)
            protect = management_condition(
                current, future, ConditionScoreType.PROTECT)
            max = np.maximum(adapt, protect)
            factor = (2 - np.sqrt(2)) / np.sqrt(2)
            return (2 * max + factor - 1)/(factor + 1)
