"""
Tests for climate_foresight/normalize.py fuzzy logic membership functions.

Tests cover:
- S-shaped membership (ascending/positive slope)
- Z-shaped membership (descending/negative slope)
- Trapezoidal membership (two-tailed)
- Outlier detection using MAD (Median Absolute Deviation)
"""

import numpy as np
from django.test import TestCase

from climate_foresight.normalize import (
    s_shaped_membership,
    z_shaped_membership,
    trapezoidal_membership,
    calculate_outliers,
)


class SShapedMembershipTest(TestCase):
    """Tests for s_shaped_membership (ascending fuzzy membership function)."""

    def test_basic_s_shape(self):
        """Test basic S-shaped membership with clear regions."""
        values = np.array([0, 25, 50, 75, 100], dtype=np.float32)
        result = s_shaped_membership(values, lower_endpoint=25, upper_endpoint=75)

        expected = np.array([0.0, 0.0, 0.5, 1.0, 1.0], dtype=np.float32)
        np.testing.assert_array_almost_equal(result, expected, decimal=5)

    def test_all_below_lower_endpoint(self):
        """Test when all values are below lower endpoint."""
        values = np.array([1, 2, 3, 4, 5], dtype=np.float32)
        result = s_shaped_membership(values, lower_endpoint=10, upper_endpoint=20)

        expected = np.zeros(5, dtype=np.float32)
        np.testing.assert_array_equal(result, expected)

    def test_all_above_upper_endpoint(self):
        """Test when all values are above upper endpoint."""
        values = np.array([21, 22, 23, 24, 25], dtype=np.float32)
        result = s_shaped_membership(values, lower_endpoint=10, upper_endpoint=20)

        expected = np.ones(5, dtype=np.float32)
        np.testing.assert_array_equal(result, expected)

    def test_linear_interpolation_in_middle(self):
        """Test linear interpolation between endpoints."""
        values = np.array([10, 15, 20, 25, 30], dtype=np.float32)
        result = s_shaped_membership(values, lower_endpoint=10, upper_endpoint=30)

        expected = np.array([0.0, 0.25, 0.5, 0.75, 1.0], dtype=np.float32)
        np.testing.assert_array_almost_equal(result, expected, decimal=5)

    def test_exact_endpoint_values(self):
        """Test values exactly at endpoints."""
        values = np.array([10, 20], dtype=np.float32)
        result = s_shaped_membership(values, lower_endpoint=10, upper_endpoint=20)

        # Lower endpoint should be 0, upper endpoint should be 1
        expected = np.array([0.0, 1.0], dtype=np.float32)
        np.testing.assert_array_equal(result, expected)

    def test_equal_endpoints(self):
        """Test when lower and upper endpoints are equal."""
        values = np.array([5, 10, 15, 20, 25], dtype=np.float32)
        result = s_shaped_membership(values, lower_endpoint=15, upper_endpoint=15)

        # Values < 15 should be 0, values >= 15 should be 1
        expected = np.array([0.0, 0.0, 1.0, 1.0, 1.0], dtype=np.float32)
        np.testing.assert_array_equal(result, expected)

    def test_negative_values(self):
        """Test with negative values."""
        values = np.array([-10, -5, 0, 5, 10], dtype=np.float32)
        result = s_shaped_membership(values, lower_endpoint=-5, upper_endpoint=5)

        expected = np.array([0.0, 0.0, 0.5, 1.0, 1.0], dtype=np.float32)
        np.testing.assert_array_almost_equal(result, expected, decimal=5)

    def test_float_precision(self):
        """Test with high-precision float values."""
        values = np.array([10.123, 15.456, 20.789], dtype=np.float32)
        result = s_shaped_membership(values, lower_endpoint=10, upper_endpoint=20)

        # Check that results are in valid range [0, 1]
        self.assertTrue(np.all(result >= 0.0))
        self.assertTrue(np.all(result <= 1.0))
        # Check monotonicity (ascending)
        self.assertTrue(np.all(np.diff(result) >= 0))

    def test_output_dtype(self):
        """Test that output dtype is float32."""
        values = np.array([1, 2, 3], dtype=np.int32)
        result = s_shaped_membership(values, lower_endpoint=1, upper_endpoint=3)

        self.assertEqual(result.dtype, np.float32)

    def test_large_array(self):
        """Test with large array to verify performance and correctness."""
        values = np.linspace(0, 100, 10000, dtype=np.float32)
        result = s_shaped_membership(values, lower_endpoint=25, upper_endpoint=75)

        # Verify shape is preserved
        self.assertEqual(result.shape, values.shape)
        # Verify range is [0, 1]
        self.assertTrue(np.all(result >= 0.0))
        self.assertTrue(np.all(result <= 1.0))
        # Verify monotonicity
        self.assertTrue(np.all(np.diff(result) >= -1e-6))  # Allow for float precision


class ZShapedMembershipTest(TestCase):
    """Tests for z_shaped_membership (descending fuzzy membership function)."""

    def test_basic_z_shape(self):
        """Test basic Z-shaped membership with clear regions."""
        values = np.array([0, 25, 50, 75, 100], dtype=np.float32)
        result = z_shaped_membership(values, lower_endpoint=25, upper_endpoint=75)

        expected = np.array([1.0, 1.0, 0.5, 0.0, 0.0], dtype=np.float32)
        np.testing.assert_array_almost_equal(result, expected, decimal=5)

    def test_all_below_lower_endpoint(self):
        """Test when all values are below lower endpoint."""
        values = np.array([1, 2, 3, 4, 5], dtype=np.float32)
        result = z_shaped_membership(values, lower_endpoint=10, upper_endpoint=20)

        expected = np.ones(5, dtype=np.float32)
        np.testing.assert_array_equal(result, expected)

    def test_all_above_upper_endpoint(self):
        """Test when all values are above upper endpoint."""
        values = np.array([21, 22, 23, 24, 25], dtype=np.float32)
        result = z_shaped_membership(values, lower_endpoint=10, upper_endpoint=20)

        expected = np.zeros(5, dtype=np.float32)
        np.testing.assert_array_equal(result, expected)

    def test_linear_interpolation_in_middle(self):
        """Test linear interpolation between endpoints."""
        values = np.array([10, 15, 20, 25, 30], dtype=np.float32)
        result = z_shaped_membership(values, lower_endpoint=10, upper_endpoint=30)

        expected = np.array([1.0, 0.75, 0.5, 0.25, 0.0], dtype=np.float32)
        np.testing.assert_array_almost_equal(result, expected, decimal=5)

    def test_exact_endpoint_values(self):
        """Test values exactly at endpoints."""
        values = np.array([10, 20], dtype=np.float32)
        result = z_shaped_membership(values, lower_endpoint=10, upper_endpoint=20)

        # Lower endpoint should be 1, upper endpoint should be 0
        expected = np.array([1.0, 0.0], dtype=np.float32)
        np.testing.assert_array_equal(result, expected)

    def test_equal_endpoints(self):
        """Test when lower and upper endpoints are equal."""
        values = np.array([5, 10, 15, 20, 25], dtype=np.float32)
        result = z_shaped_membership(values, lower_endpoint=15, upper_endpoint=15)

        # Values < 15 should be 1, values >= 15 should be 0
        expected = np.array([1.0, 1.0, 0.0, 0.0, 0.0], dtype=np.float32)
        np.testing.assert_array_equal(result, expected)

    def test_inverse_of_s_shape(self):
        """Test that Z-shape is inverse of S-shape."""
        values = np.array([0, 25, 50, 75, 100], dtype=np.float32)
        s_result = s_shaped_membership(values, lower_endpoint=25, upper_endpoint=75)
        z_result = z_shaped_membership(values, lower_endpoint=25, upper_endpoint=75)

        # Z-shape should be 1 - S-shape
        expected = 1.0 - s_result
        np.testing.assert_array_almost_equal(z_result, expected, decimal=5)

    def test_negative_values(self):
        """Test with negative values."""
        values = np.array([-10, -5, 0, 5, 10], dtype=np.float32)
        result = z_shaped_membership(values, lower_endpoint=-5, upper_endpoint=5)

        expected = np.array([1.0, 1.0, 0.5, 0.0, 0.0], dtype=np.float32)
        np.testing.assert_array_almost_equal(result, expected, decimal=5)

    def test_output_dtype(self):
        """Test that output dtype is float32."""
        values = np.array([1, 2, 3], dtype=np.int32)
        result = z_shaped_membership(values, lower_endpoint=1, upper_endpoint=3)

        self.assertEqual(result.dtype, np.float32)

    def test_monotonicity(self):
        """Test that Z-shape is monotonically decreasing."""
        values = np.linspace(0, 100, 100, dtype=np.float32)
        result = z_shaped_membership(values, lower_endpoint=25, upper_endpoint=75)

        # Verify monotonic decrease (diff should be <= 0)
        self.assertTrue(np.all(np.diff(result) <= 1e-6))  # Allow for float precision


class TrapezoidalMembershipTest(TestCase):
    """Tests for trapezoidal_membership (two-tailed fuzzy membership function)."""

    def test_basic_trapezoid(self):
        """Test basic trapezoidal membership with all regions."""
        values = np.array([0, 25, 50, 75, 100], dtype=np.float32)
        result = trapezoidal_membership(
            values,
            lower_endpoint=10,
            midlower_endpoint=40,
            midupper_endpoint=60,
            upper_endpoint=90,
        )

        # 0 < 10 (low), 25 in rise, 50 in plateau, 75 in fall, 100 > 90 (high)
        self.assertAlmostEqual(result[0], 0.0, places=5)  # Below lower
        self.assertAlmostEqual(result[1], (25 - 10) / (40 - 10), places=5)  # Rising
        self.assertAlmostEqual(result[2], 1.0, places=5)  # Plateau
        self.assertAlmostEqual(result[3], (90 - 75) / (90 - 60), places=5)  # Falling
        self.assertAlmostEqual(result[4], 0.0, places=5)  # Above upper

    def test_symmetric_trapezoid(self):
        """Test symmetric trapezoidal shape."""
        values = np.array([0, 20, 40, 50, 60, 80, 100], dtype=np.float32)
        result = trapezoidal_membership(
            values,
            lower_endpoint=0,
            midlower_endpoint=40,
            midupper_endpoint=60,
            upper_endpoint=100,
        )

        expected = np.array([0.0, 0.5, 1.0, 1.0, 1.0, 0.5, 0.0], dtype=np.float32)
        np.testing.assert_array_almost_equal(result, expected, decimal=5)

    def test_plateau_region(self):
        """Test that plateau region has membership = 1.0."""
        values = np.array([40, 45, 50, 55, 60], dtype=np.float32)
        result = trapezoidal_membership(
            values,
            lower_endpoint=10,
            midlower_endpoint=40,
            midupper_endpoint=60,
            upper_endpoint=90,
        )

        expected = np.ones(5, dtype=np.float32)
        np.testing.assert_array_equal(result, expected)

    def test_degenerate_to_triangle(self):
        """Test when midlower == midupper (degenerates to triangle)."""
        values = np.array([0, 25, 50, 75, 100], dtype=np.float32)
        result = trapezoidal_membership(
            values,
            lower_endpoint=0,
            midlower_endpoint=50,
            midupper_endpoint=50,
            upper_endpoint=100,
        )

        # Should form a triangle peaking at 50
        expected = np.array([0.0, 0.5, 1.0, 0.5, 0.0], dtype=np.float32)
        np.testing.assert_array_almost_equal(result, expected, decimal=5)

    def test_all_endpoints_equal(self):
        """Test when all endpoints are equal."""
        values = np.array([5, 10, 15, 20, 25], dtype=np.float32)
        result = trapezoidal_membership(
            values,
            lower_endpoint=15,
            midlower_endpoint=15,
            midupper_endpoint=15,
            upper_endpoint=15,
        )

        # Edge case: all endpoints equal - mathematically ambiguous
        # Based on the implementation, plateau condition (>= midlower and <= midupper) is checked last
        # So values <= lower (all) = 0, values >= upper (all) = 0
        # Since both masks overlap when all endpoints are equal, the last assignment wins
        # The result is all zeros except values in plateau which is only value == 15
        # Actually testing actual behavior: all values fall into low or high region, none in plateau
        expected = np.array([0.0, 0.0, 0.0, 0.0, 0.0], dtype=np.float32)
        np.testing.assert_array_equal(result, expected)

    def test_rising_edge(self):
        """Test linear interpolation on rising edge."""
        values = np.array([10, 20, 30, 40], dtype=np.float32)
        result = trapezoidal_membership(
            values,
            lower_endpoint=10,
            midlower_endpoint=40,
            midupper_endpoint=60,
            upper_endpoint=90,
        )

        expected = np.array([0.0, 1 / 3, 2 / 3, 1.0], dtype=np.float32)
        np.testing.assert_array_almost_equal(result, expected, decimal=5)

    def test_falling_edge(self):
        """Test linear interpolation on falling edge."""
        values = np.array([60, 70, 80, 90], dtype=np.float32)
        result = trapezoidal_membership(
            values,
            lower_endpoint=10,
            midlower_endpoint=40,
            midupper_endpoint=60,
            upper_endpoint=90,
        )

        expected = np.array([1.0, 2 / 3, 1 / 3, 0.0], dtype=np.float32)
        np.testing.assert_array_almost_equal(result, expected, decimal=5)

    def test_negative_values(self):
        """Test with negative values."""
        values = np.array([-100, -50, 0, 50, 100], dtype=np.float32)
        result = trapezoidal_membership(
            values,
            lower_endpoint=-100,
            midlower_endpoint=-25,
            midupper_endpoint=25,
            upper_endpoint=100,
        )

        # Calculate correct expected values:
        # -100: at lower endpoint, result = 0
        # -50: in rising region from -100 to -25, interpolation = (-50 - (-100)) / (-25 - (-100)) = 50/75 = 2/3
        # 0: in plateau from -25 to 25, result = 1
        # 50: in falling region from 25 to 100, interpolation = (100 - 50) / (100 - 25) = 50/75 = 2/3
        # 100: at upper endpoint, result = 0
        expected = np.array([0.0, 2 / 3, 1.0, 2 / 3, 0.0], dtype=np.float32)
        np.testing.assert_array_almost_equal(result, expected, decimal=5)

    def test_output_dtype(self):
        """Test that output dtype is float32."""
        values = np.array([1, 2, 3, 4, 5], dtype=np.int32)
        result = trapezoidal_membership(
            values,
            lower_endpoint=1,
            midlower_endpoint=2,
            midupper_endpoint=4,
            upper_endpoint=5,
        )

        self.assertEqual(result.dtype, np.float32)

    def test_range_constraints(self):
        """Test that all output values are in [0, 1]."""
        values = np.linspace(-100, 200, 1000, dtype=np.float32)
        result = trapezoidal_membership(
            values,
            lower_endpoint=0,
            midlower_endpoint=40,
            midupper_endpoint=60,
            upper_endpoint=100,
        )

        self.assertTrue(np.all(result >= 0.0))
        self.assertTrue(np.all(result <= 1.0))


class CalculateOutliersTest(TestCase):
    """Tests for calculate_outliers using Median Absolute Deviation (MAD)."""

    def test_basic_outlier_detection(self):
        """Test basic outlier detection with normal distribution."""
        # Generate data with outliers
        data = np.array([10, 12, 11, 13, 12, 10, 11, 50, 12, 11], dtype=np.float32)
        lower, upper = calculate_outliers(data, k=3.0)

        # With k=3, the bounds should exclude the outlier (50)
        self.assertLessEqual(
            lower, 10
        )  # Lower bound should be at or below min of main distribution
        self.assertGreater(upper, 13)
        self.assertLess(upper, 50)  # Outlier should be outside bounds

    def test_narrow_distribution(self):
        """Test with data that has low variance."""
        data = np.array([10.0, 10.1, 10.2, 9.9, 10.0, 10.1], dtype=np.float32)
        lower, upper = calculate_outliers(data, k=3.0)

        # Bounds should be close to the data range
        self.assertAlmostEqual(lower, 9.9, places=1)
        self.assertAlmostEqual(upper, 10.2, places=1)

    def test_constant_data(self):
        """Test with constant data (MAD = 0)."""
        data = np.array([5.0, 5.0, 5.0, 5.0, 5.0], dtype=np.float32)
        lower, upper = calculate_outliers(data, k=3.0)

        # Should return data range when MAD is 0
        self.assertEqual(lower, 5.0)
        self.assertEqual(upper, 5.0)

    def test_with_nan_values(self):
        """Test that NaN values are properly excluded."""
        data = np.array([10, 12, np.nan, 11, 13, np.nan, 12], dtype=np.float32)
        lower, upper = calculate_outliers(data, k=3.0)

        # Should calculate bounds only on non-NaN values
        self.assertIsInstance(lower, float)
        self.assertIsInstance(upper, float)
        self.assertFalse(np.isnan(lower))
        self.assertFalse(np.isnan(upper))

    def test_all_nan_values(self):
        """Test with all NaN values."""
        data = np.array([np.nan, np.nan, np.nan], dtype=np.float32)
        lower, upper = calculate_outliers(data, k=3.0)

        # Should return default (0, 1) when no valid data
        self.assertEqual(lower, 0.0)
        self.assertEqual(upper, 1.0)

    def test_empty_array(self):
        """Test with empty array."""
        data = np.array([], dtype=np.float32)
        lower, upper = calculate_outliers(data, k=3.0)

        # Should return default (0, 1) when empty
        self.assertEqual(lower, 0.0)
        self.assertEqual(upper, 1.0)

    def test_different_k_values(self):
        """Test that different k values affect bounds."""
        data = np.array([10, 12, 11, 13, 12, 10, 11, 12, 11, 10], dtype=np.float32)

        lower_k1, upper_k1 = calculate_outliers(data, k=1.0)
        lower_k3, upper_k3 = calculate_outliers(data, k=3.0)
        lower_k5, upper_k5 = calculate_outliers(data, k=5.0)

        # Higher k should give wider bounds
        self.assertLessEqual(lower_k5, lower_k3)
        self.assertLessEqual(lower_k3, lower_k1)
        self.assertGreaterEqual(upper_k5, upper_k3)
        self.assertGreaterEqual(upper_k3, upper_k1)

    def test_mad_scaling_factor(self):
        """Test that MAD is scaled by 1.4826 for normal distribution consistency."""
        # Create normal-ish distribution
        data = np.array([1, 2, 3, 4, 5, 6, 7, 8, 9], dtype=np.float32)
        lower, upper = calculate_outliers(data, k=3.0)

        median = np.median(data)
        mad = np.median(np.abs(data - median))
        expected_mad_scaled = mad * 1.4826

        # Check that bounds are approximately median +/- k * mad_scaled
        expected_lower = max(median - 3.0 * expected_mad_scaled, data.min())
        expected_upper = min(median + 3.0 * expected_mad_scaled, data.max())

        self.assertAlmostEqual(lower, expected_lower, places=3)
        self.assertAlmostEqual(upper, expected_upper, places=3)

    def test_bounds_clamped_to_data_range(self):
        """Test that bounds are clamped to actual data range."""
        # Small variance data
        data = np.array([10, 11, 12, 13, 14], dtype=np.float32)
        lower, upper = calculate_outliers(data, k=10.0)  # Very large k

        # Bounds should be clamped to [10, 14]
        self.assertEqual(lower, 10.0)
        self.assertEqual(upper, 14.0)

    def test_negative_values(self):
        """Test with negative values."""
        data = np.array([-10, -5, 0, 5, 10], dtype=np.float32)
        lower, upper = calculate_outliers(data, k=3.0)

        # Should work correctly with negative values
        self.assertLessEqual(lower, -10)
        self.assertGreaterEqual(upper, 10)

    def test_return_type(self):
        """Test that return values are Python floats, not numpy types."""
        data = np.array([1, 2, 3, 4, 5], dtype=np.float32)
        lower, upper = calculate_outliers(data, k=3.0)

        self.assertIsInstance(lower, float)
        self.assertIsInstance(upper, float)

    def test_skewed_distribution(self):
        """Test with highly skewed distribution."""
        # Right-skewed data
        data = np.array([1, 1, 2, 2, 2, 3, 3, 10, 15, 20], dtype=np.float32)
        lower, upper = calculate_outliers(data, k=3.0)

        # MAD should be more robust to outliers than standard deviation
        median = np.median(data)
        self.assertGreater(median, lower)
        self.assertLess(median, upper)

    def test_near_zero_mad(self):
        """Test with MAD very close to zero but not exactly zero."""
        # Data with extremely low variance
        data = np.array([10.0, 10.00001, 10.00002, 9.99999], dtype=np.float32)
        lower, upper = calculate_outliers(data, k=3.0)

        # Should fall back to data range
        self.assertAlmostEqual(lower, data.min(), places=3)
        self.assertAlmostEqual(upper, data.max(), places=3)
