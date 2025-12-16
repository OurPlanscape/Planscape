"""
Tests for climate_foresight/promote.py - PROMOTe (MPAT) analysis functions.

Tests cover:
- rescale_linear: Linear rescaling from one range to another
- calculate_promote_strategy_score: Euclidean distance-based scoring in 2D space
- Edge cases and numerical correctness
"""

import numpy as np
from django.test import TestCase

from climate_foresight.promote import (
    rescale_linear,
    calculate_promote_strategy_score,
)


class RescaleLinearTest(TestCase):
    """Tests for linear rescaling function."""

    def test_basic_rescaling_0_1_to_0_100(self):
        """Test rescaling from [0, 1] to [0, 100]."""
        values = np.array([0.0, 0.25, 0.5, 0.75, 1.0], dtype=np.float32)
        result = rescale_linear(
            values, from_min=0.0, from_max=1.0, to_min=0.0, to_max=100.0
        )

        expected = np.array([0.0, 25.0, 50.0, 75.0, 100.0], dtype=np.float32)
        np.testing.assert_array_almost_equal(result, expected, decimal=5)

    def test_rescaling_10_20_to_0_100(self):
        """Test rescaling from arbitrary range to [0, 100]."""
        values = np.array([10, 12, 15, 18, 20], dtype=np.float32)
        result = rescale_linear(values, from_min=10, from_max=20, to_min=0, to_max=100)

        expected = np.array([0, 20, 50, 80, 100], dtype=np.float32)
        np.testing.assert_array_almost_equal(result, expected, decimal=5)

    def test_reverse_rescaling_100_to_0(self):
        """Test rescaling with inverted target range (descending)."""
        values = np.array([0, 25, 50, 75, 100], dtype=np.float32)
        result = rescale_linear(values, from_min=0, from_max=100, to_min=100, to_max=0)

        expected = np.array([100, 75, 50, 25, 0], dtype=np.float32)
        np.testing.assert_array_almost_equal(result, expected, decimal=5)

    def test_negative_values(self):
        """Test rescaling with negative values."""
        values = np.array([-10, -5, 0, 5, 10], dtype=np.float32)
        result = rescale_linear(values, from_min=-10, from_max=10, to_min=0, to_max=100)

        expected = np.array([0, 25, 50, 75, 100], dtype=np.float32)
        np.testing.assert_array_almost_equal(result, expected, decimal=5)

    def test_equal_from_range(self):
        """Test when from_min == from_max (constant input)."""
        values = np.array([5, 5, 5, 5], dtype=np.float32)
        result = rescale_linear(values, from_min=5, from_max=5, to_min=0, to_max=100)

        # Should return midpoint of target range
        expected = np.array([50, 50, 50, 50], dtype=np.float32)
        np.testing.assert_array_equal(result, expected)

    def test_clipping_below_range(self):
        """Test that values below from_min are clipped to to_min."""
        values = np.array([-10, 0, 5, 10, 15], dtype=np.float32)
        result = rescale_linear(values, from_min=0, from_max=10, to_min=0, to_max=100)

        # -10 should be clipped to 0
        self.assertEqual(result[0], 0.0)
        # 10 should map to 100
        self.assertEqual(result[3], 100.0)
        # 15 should be clipped to 100
        self.assertEqual(result[4], 100.0)

    def test_clipping_above_range(self):
        """Test that values above from_max are clipped to to_max."""
        values = np.array([5, 10, 15, 20, 25], dtype=np.float32)
        result = rescale_linear(values, from_min=10, from_max=20, to_min=0, to_max=100)

        # 5 should be clipped to 0
        self.assertEqual(result[0], 0.0)
        # 25 should be clipped to 100
        self.assertEqual(result[4], 100.0)

    def test_output_dtype(self):
        """Test that output dtype is float32."""
        values = np.array([1, 2, 3], dtype=np.int32)
        result = rescale_linear(values, from_min=1, from_max=3, to_min=0, to_max=100)

        self.assertEqual(result.dtype, np.float32)

    def test_identity_rescaling(self):
        """Test rescaling to same range (identity)."""
        values = np.array([0, 25, 50, 75, 100], dtype=np.float32)
        result = rescale_linear(values, from_min=0, from_max=100, to_min=0, to_max=100)

        np.testing.assert_array_almost_equal(result, values, decimal=5)

    def test_small_range(self):
        """Test rescaling with very small input range."""
        values = np.array([0.0, 0.001, 0.002], dtype=np.float32)
        result = rescale_linear(
            values, from_min=0.0, from_max=0.002, to_min=0, to_max=100
        )

        expected = np.array([0, 50, 100], dtype=np.float32)
        np.testing.assert_array_almost_equal(result, expected, decimal=3)

    def test_custom_target_range(self):
        """Test rescaling to custom target range."""
        values = np.array([0, 5, 10], dtype=np.float32)
        result = rescale_linear(values, from_min=0, from_max=10, to_min=50, to_max=150)

        expected = np.array([50, 100, 150], dtype=np.float32)
        np.testing.assert_array_almost_equal(result, expected, decimal=5)


class CalculatePromoteStrategyScoreTest(TestCase):
    """Tests for PROMOTe strategy scoring (Euclidean distance-based)."""

    def test_perfect_match_at_target(self):
        """Test that being at target corner gives score of 100."""
        current = np.array([100], dtype=np.float32)
        future = np.array([100], dtype=np.float32)

        # Monitor strategy (100, 100)
        score = calculate_promote_strategy_score(
            current, future, target_x=100, target_y=100
        )

        self.assertAlmostEqual(score[0], 100.0, places=2)

    def test_opposite_corner_gives_zero(self):
        """Test that opposite corner gives score close to 0."""
        current = np.array([0], dtype=np.float32)
        future = np.array([0], dtype=np.float32)

        # Monitor strategy target (100, 100) - opposite corner is (0, 0)
        score = calculate_promote_strategy_score(
            current, future, target_x=100, target_y=100
        )

        # Distance is sqrt(100^2 + 100^2) = sqrt(20000) = max_distance
        # So score should be 0
        self.assertAlmostEqual(score[0], 0.0, places=2)

    def test_monitor_strategy_corners(self):
        """Test Monitor strategy (100, 100) at all four corners."""
        current = np.array([100, 100, 0, 0], dtype=np.float32)
        future = np.array([100, 0, 100, 0], dtype=np.float32)

        scores = calculate_promote_strategy_score(
            current, future, target_x=100, target_y=100
        )

        # (100, 100) - at target, score = 100
        self.assertAlmostEqual(scores[0], 100.0, places=2)
        # (100, 0) - distance 100, score between 0 and 100
        self.assertGreater(scores[1], 0)
        self.assertLess(scores[1], 100)
        # (0, 100) - distance 100, score between 0 and 100
        self.assertGreater(scores[2], 0)
        self.assertLess(scores[2], 100)
        # (0, 0) - at opposite corner, score = 0
        self.assertAlmostEqual(scores[3], 0.0, places=2)

    def test_protect_strategy_target(self):
        """Test Protect strategy (100, 0)."""
        current = np.array([100], dtype=np.float32)
        future = np.array([0], dtype=np.float32)

        # At Protect corner
        score = calculate_promote_strategy_score(
            current, future, target_x=100, target_y=0
        )

        self.assertAlmostEqual(score[0], 100.0, places=2)

    def test_adapt_strategy_target(self):
        """Test Adapt strategy (0, 100)."""
        current = np.array([0], dtype=np.float32)
        future = np.array([100], dtype=np.float32)

        # At Adapt corner
        score = calculate_promote_strategy_score(
            current, future, target_x=0, target_y=100
        )

        self.assertAlmostEqual(score[0], 100.0, places=2)

    def test_transform_strategy_target(self):
        """Test Transform strategy (0, 0)."""
        current = np.array([0], dtype=np.float32)
        future = np.array([0], dtype=np.float32)

        # At Transform corner
        score = calculate_promote_strategy_score(
            current, future, target_x=0, target_y=0
        )

        self.assertAlmostEqual(score[0], 100.0, places=2)

    def test_center_point(self):
        """Test scoring at center of 100x100 space."""
        current = np.array([50], dtype=np.float32)
        future = np.array([50], dtype=np.float32)

        # Distance from (50, 50) to any corner is sqrt(50^2 + 50^2) = sqrt(5000) ≈ 70.71
        # Max distance is sqrt(20000) ≈ 141.42
        # Score should be around 50 (halfway)

        scores = []
        for target_x, target_y in [(100, 100), (100, 0), (0, 100), (0, 0)]:
            score = calculate_promote_strategy_score(
                current, future, target_x=target_x, target_y=target_y
            )
            scores.append(score[0])

        # All scores should be equal (center is equidistant from all corners)
        for i in range(1, 4):
            self.assertAlmostEqual(scores[i], scores[0], places=2)

        # Score should be around 50
        self.assertAlmostEqual(scores[0], 50.0, delta=5.0)

    def test_euclidean_distance_calculation(self):
        """Test that Euclidean distance is calculated correctly."""
        # (30, 40) to (0, 0) should have distance sqrt(30^2 + 40^2) = 50
        current = np.array([30], dtype=np.float32)
        future = np.array([40], dtype=np.float32)

        score = calculate_promote_strategy_score(
            current, future, target_x=0, target_y=0
        )

        # Distance 50, max_distance = sqrt(20000) ≈ 141.42
        # Score = 100 - (50 / 141.42) * 100 ≈ 64.65
        expected_score = 100 - (50 / np.sqrt(20000)) * 100
        self.assertAlmostEqual(score[0], expected_score, places=1)

    def test_multiple_cells(self):
        """Test scoring multiple cells at once."""
        current = np.array([0, 50, 100], dtype=np.float32)
        future = np.array([0, 50, 100], dtype=np.float32)

        # Monitor strategy (100, 100)
        scores = calculate_promote_strategy_score(
            current, future, target_x=100, target_y=100
        )

        # Scores should be ascending (closer to target = higher score)
        self.assertLess(scores[0], scores[1])
        self.assertLess(scores[1], scores[2])
        self.assertAlmostEqual(scores[2], 100.0, places=2)

    def test_score_range(self):
        """Test that all scores are in [0, 100] range."""
        # Create grid of points
        current = np.array([0, 25, 50, 75, 100] * 5, dtype=np.float32)
        future = np.repeat([0, 25, 50, 75, 100], 5).astype(np.float32)

        for target_x, target_y in [(100, 100), (100, 0), (0, 100), (0, 0)]:
            scores = calculate_promote_strategy_score(
                current, future, target_x=target_x, target_y=target_y
            )

            # All scores should be in [0, 100]
            self.assertTrue(np.all(scores >= 0))
            self.assertTrue(np.all(scores <= 100))

    def test_symmetry(self):
        """Test that score is symmetric (distance is same from A to B as B to A)."""
        current1 = np.array([30], dtype=np.float32)
        future1 = np.array([40], dtype=np.float32)

        current2 = np.array([70], dtype=np.float32)
        future2 = np.array([60], dtype=np.float32)

        # Both should have same distance from (50, 50)
        score1 = calculate_promote_strategy_score(
            current1, future1, target_x=50, target_y=50
        )
        score2 = calculate_promote_strategy_score(
            current2, future2, target_x=50, target_y=50
        )

        # Distances: (30, 40) to (50, 50) = sqrt(20^2 + 10^2) = sqrt(500)
        #            (70, 60) to (50, 50) = sqrt(20^2 + 10^2) = sqrt(500)
        self.assertAlmostEqual(score1[0], score2[0], places=5)

    def test_output_dtype(self):
        """Test that output dtype is float32."""
        current = np.array([50], dtype=np.int32)
        future = np.array([50], dtype=np.int32)

        score = calculate_promote_strategy_score(
            current, future, target_x=100, target_y=100
        )

        self.assertEqual(score.dtype, np.float32)

    def test_max_distance_constant(self):
        """Test that max distance (sqrt(20000)) is used correctly."""
        # Maximum possible distance in 100x100 space is from (0,0) to (100,100)
        # or any opposite corners: sqrt(100^2 + 100^2) = sqrt(20000) ≈ 141.42

        current = np.array([0], dtype=np.float32)
        future = np.array([0], dtype=np.float32)

        # Score from (0, 0) to target (100, 100) should be 0
        score = calculate_promote_strategy_score(
            current, future, target_x=100, target_y=100
        )
        self.assertAlmostEqual(score[0], 0.0, places=2)

        # Score from (100, 100) to target (100, 100) should be 100
        current = np.array([100], dtype=np.float32)
        future = np.array([100], dtype=np.float32)
        score = calculate_promote_strategy_score(
            current, future, target_x=100, target_y=100
        )
        self.assertAlmostEqual(score[0], 100.0, places=2)

    def test_diagonal_gradient(self):
        """Test gradient along diagonal."""
        # Points along diagonal from (0, 0) to (100, 100)
        current = np.array([0, 25, 50, 75, 100], dtype=np.float32)
        future = np.array([0, 25, 50, 75, 100], dtype=np.float32)

        # Monitor strategy target (100, 100)
        scores = calculate_promote_strategy_score(
            current, future, target_x=100, target_y=100
        )

        # Scores should be monotonically increasing along diagonal
        for i in range(4):
            self.assertLess(scores[i], scores[i + 1])
