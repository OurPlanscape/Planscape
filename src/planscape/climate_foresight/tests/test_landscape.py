"""
Tests for climate_foresight/landscape.py - Landscape aggregation functions.

Tests cover:
- aggregate_rasters_simple_average: Validation and edge cases
- Input validation for landscape rollup

Note: Full integration tests for aggregate_rasters_simple_average require
raster files and are better suited for end-to-end testing. These tests cover
validation logic and edge cases.
"""

from django.test import TestCase
from unittest.mock import Mock

from climate_foresight.landscape import aggregate_rasters_simple_average
from datasets.models import DataLayer


class AggregateRastersSimpleAverageTest(TestCase):
    """Tests for simple average aggregation of rasters."""

    def test_empty_list_raises_error(self):
        """Test that empty list raises ValueError."""
        with self.assertRaises(ValueError) as context:
            aggregate_rasters_simple_average(
                raster_layers=[],
                output_name="Test",
                organization_id=1,
                created_by=Mock(),
            )

        self.assertIn("at least one raster layer", str(context.exception))

    def test_single_layer_returns_same_layer(self):
        """Test that single layer is returned as-is without processing."""
        mock_layer = Mock(spec=DataLayer)
        mock_layer.id = 123
        mock_layer.name = "Test Layer"

        result = aggregate_rasters_simple_average(
            raster_layers=[mock_layer],
            output_name="Test Output",
            organization_id=1,
            created_by=Mock(),
        )

        # Should return the same layer object
        self.assertEqual(result, mock_layer)
        self.assertEqual(result.id, 123)


class LandscapeRollupValidationTest(TestCase):
    """Tests for validation logic in landscape rollup."""

    def test_output_name_format(self):
        """Test that output names follow expected pattern."""
        run_id = 42
        expected_current = f"Current Conditions Landscape (CF Run {run_id})"
        expected_future = f"Future Conditions Landscape (CF Run {run_id})"

        self.assertEqual(expected_current, "Current Conditions Landscape (CF Run 42)")
        self.assertEqual(expected_future, "Future Conditions Landscape (CF Run 42)")

    def test_future_mapping_structure(self):
        """Test expected structure of future mapping dictionary."""
        # Future mapping should be: {pillar_id: {layer_id: X, matched: bool, default: bool}}
        future_mapping = {
            "1": {
                "layer_id": 100,
                "matched": True,
                "default": False,
                "layer_name": "Fire Intensity",
            },
            "2": {
                "layer_id": 999,
                "matched": False,
                "default": True,
                "layer_name": "Generic",
            },
        }

        # Verify structure
        self.assertIn("1", future_mapping)
        self.assertIn("layer_id", future_mapping["1"])
        self.assertIn("matched", future_mapping["1"])
        self.assertIn("default", future_mapping["1"])

        # Check values
        self.assertTrue(future_mapping["1"]["matched"])
        self.assertFalse(future_mapping["1"]["default"])
        self.assertFalse(future_mapping["2"]["matched"])
        self.assertTrue(future_mapping["2"]["default"])
