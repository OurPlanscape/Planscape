import logging
from typing import Tuple

import numpy as np


def s_shaped_membership(
    values: np.ndarray, lower_endpoint: float, upper_endpoint: float
) -> np.ndarray:
    """
    Linear S-shaped membership function (ascending/positive slope).

    Maps values to [0, 1] where:
    - values <= lower_endpoint: output = 0
    - lower_endpoint < values < upper_endpoint: linear interpolation from 0 to 1
    - values >= upper_endpoint: output = 1

    Used for "Positive Linear Slope" translation where high values are favorable.

    Args:
        x: Input values
        lower_endpoint: Lower endpoint (values <= lower_endpoint map to 0)
        upper_endpoint: Upper endpoint (values >= upper_endpoint map to 1)


    Returns:
        Membership values in [0, 1]
    """
    result = np.zeros_like(values, dtype=np.float32)

    mask_low = values <= lower_endpoint
    mask_mid = (values > lower_endpoint) & (values < upper_endpoint)
    mask_high = values >= upper_endpoint

    # set each region to its corresponding value
    result[mask_low] = 0.0

    # linear interpolation between the endpoints
    if upper_endpoint != lower_endpoint:
        result[mask_mid] = (values[mask_mid] - lower_endpoint) / (
            upper_endpoint - lower_endpoint
        )

    result[mask_high] = 1.0

    return result


def z_shaped_membership(
    values: np.ndarray, lower_endpoint: float, upper_endpoint: float
) -> np.ndarray:
    """
    Linear Z-shaped membership function (descending/negative slope).

    Maps values to [0, 1] where:
    - values <= lower_endpoint: output = 1
    - lower_endpoint < values < upper_endpoint: linear interpolation from 1 to 0
    - values >= upper_endpoint: output = 0

    Used for "Negative Linear Slope" translation where low values are favorable.

    Args:
        x: Input values
        lower_endpoint: Lower endpoint (values <= lower_endpoint map to 1)
        upper_endpoint: Upper endpoint (values >= upper_endpoint map to 0)

    Returns:
        Membership values in [0, 1]
    """
    result = np.zeros_like(values, dtype=np.float32)

    mask_low = values <= lower_endpoint
    mask_mid = (values > lower_endpoint) & (values < upper_endpoint)
    mask_high = values >= upper_endpoint

    # set each region to its corresponding value
    result[mask_low] = 1.0

    # linear interpolation between the endpoints
    if upper_endpoint != lower_endpoint:
        result[mask_mid] = (upper_endpoint - values[mask_mid]) / (
            upper_endpoint - lower_endpoint
        )

    result[mask_high] = 0.0

    return result


def trapezoidal_membership(
    values: np.ndarray,
    lower_endpoint: float,
    midlower_endpoint: float,
    midupper_endpoint: float,
    upper_endpoint: float,
) -> np.ndarray:
    """
    Trapezoidal membership function (two-tailed).

    Maps values to [0, 1] where:
    - values <= lower_endpoint: output = 0
    - lower_endpoint < values < midlower_endpoint: linear interpolation from 0 to 1 (ascending)
    - midlower_endpoint <= values <= midupper_endpoint: output = 1 (plateau)
    - midupper_endpoint < values < upper_endpoint: linear interpolation from 1 to 0 (descending)
    - values >= upper_endpoint: output = 0

    Used for "Two-Tailed" translation where middle values are favorable.

    Args:
        x: Input values
        lower_endpoint: First endpoint (values <= lower_endpoint map to 0)
        midlower_endpoint: Second endpoint (start of plateau at 1)
        midupper_endpoint: Third endpoint (end of plateau at 1)
        upper_endpoint: Fourth endpoint (values >= upper_endpoint map to 0)

    Returns:
        Membership values in [0, 1]
    """
    result = np.zeros_like(values, dtype=np.float32)

    mask_low = values <= lower_endpoint
    mask_rise = (values > lower_endpoint) & (values < midlower_endpoint)
    mask_plateau = (values >= midlower_endpoint) & (values <= midupper_endpoint)
    mask_fall = (values > midupper_endpoint) & (values < upper_endpoint)
    mask_high = values >= upper_endpoint

    # set each region to its corresponding value
    result[mask_low] = 0.0

    # linear interpolation between the lower and midlower endpoints
    if midlower_endpoint != lower_endpoint:
        result[mask_rise] = (values[mask_rise] - lower_endpoint) / (
            midlower_endpoint - lower_endpoint
        )

    result[mask_plateau] = 1.0

    # linear interpolation between the midupper and upper endpoints
    if upper_endpoint != midupper_endpoint:
        result[mask_fall] = (upper_endpoint - values[mask_fall]) / (
            upper_endpoint - midupper_endpoint
        )

    result[mask_high] = 0.0

    return result


def calculate_outliers(
    data: np.ndarray, k: float = 3.0, method: str = "MAD"
) -> Tuple[float, float]:
    """
    Calculate outlier bounds using statistical methods.

    Implements outlier detection similar to R's univOutl::LocScaleB.
    Uses median and MAD (Median Absolute Deviation) for robust estimation.

    Args:
        data: Array of values
        k: Extension constant for bounds (higher = more aggressive outlier detection)
        method: Method for outlier detection ('MAD' for median absolute deviation)

    Returns:
        Tuple of (lower_bound, upper_bound)
    """
    log = logging.getLogger(__name__)

    clean_data = data[~np.isnan(data)]

    if len(clean_data) == 0:
        return (0.0, 1.0)

    median = np.median(clean_data)
    mad = np.median(np.abs(clean_data - median))

    # scale factor to make MAD consistent with standard deviation for normal distribution
    mad_scaled = mad * 1.4826

    data_min = np.min(clean_data)
    data_max = np.max(clean_data)

    # if MAD is 0, the data has very low variance (most values are the same)
    # in this case, use the actual data range instead of outlier detection
    # otherwise we'll get datalayers full of 0s or 1s
    if mad_scaled == 0.0 or mad_scaled < 1e-10:
        log.info(
            f"MAD is zero or near-zero (median: {median}, mad: {mad}), "
            f"using data range instead: [{data_min}, {data_max}]"
        )
        return (float(data_min), float(data_max))

    lower_bound = median - k * mad_scaled
    upper_bound = median + k * mad_scaled

    if lower_bound < data_min:
        lower_bound = data_min

    if upper_bound > data_max:
        upper_bound = data_max

    return (float(lower_bound), float(upper_bound))
