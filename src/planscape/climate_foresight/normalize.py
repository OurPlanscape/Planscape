import numpy as np
from scipy import stats


def safe_ad_test(data: np.ndarray) -> float:
    """
    Safely perform Anderson-Darling test for normality and return p-value approximation.

    Args:
        data: Array of values to test

    Returns:
        Approximate p-value (based on critical values)
    """
    try:
        result = stats.anderson(data, dist="norm")
        statistic = result.statistic

        if statistic < result.critical_values[4]:
            return 0.05
        elif statistic < result.critical_values[3]:
            return 0.02
        elif statistic < result.critical_values[2]:
            return 0.01
        elif statistic < result.critical_values[1]:
            return 0.005
        else:
            return 0.001

    except Exception:
        return np.nan


def safe_log_transform(values: np.ndarray) -> np.ndarray:
    """Apply log transformation, handling non-positive values."""
    if np.any(values <= 0):
        shifted_values = values - np.min(values) + 1
        return np.log(shifted_values)
    return np.log(values)


def safe_sqrt_transform(values: np.ndarray) -> np.ndarray:
    """Apply sqrt transformation, handling negative values."""
    if np.any(values < 0):
        shifted_values = values - np.min(values)
        return np.sqrt(shifted_values)
    return np.sqrt(values)


def safe_boxcox_transform(values: np.ndarray) -> np.ndarray:
    """Apply Box-Cox transformation, handling non-positive values."""
    try:
        if np.any(values <= 0):
            shifted_values = values - np.min(values) + 1
        else:
            shifted_values = values

        transformed, _ = stats.boxcox(shifted_values)
        return transformed
    except Exception:
        return None


def safe_yeojohnson_transform(values: np.ndarray) -> np.ndarray:
    """Apply Yeo-Johnson transformation (works with negative values)."""
    try:
        transformed, _ = stats.yeojohnson(values)
        return transformed
    except Exception:
        return None
