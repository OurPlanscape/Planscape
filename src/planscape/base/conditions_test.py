""" Tests for the conditions.py file. """

import unittest

import numpy as np
from base.condition_types import ConditionScoreType
from base.conditions import (
    average_condition,
    management_condition,
    weighted_average_condition,
    convert_nodata_to_nan,
)


class AverageTest(unittest.TestCase):
    def test_average(self):
        condition1 = np.array([[1, 2, 3], [4, 5, 6]])
        condition2 = np.array([[11, 12, 13], [14, 15, 16]])
        expected = np.array([[6, 7, 8], [9, 10, 11]])
        average = average_condition(np.nan, [condition1, condition2])
        self.assertIsNotNone(average)
        self.assertTrue(np.all(average == expected))

    def test_average_ignores_nans(self):
        condition1 = np.array([[1, 2, 3], [4, 5, 6]])
        condition2 = np.array([[11, 12, 13], [np.nan, 15, 16]])
        expected = np.array([[6, 7, 8], [4, 10, 11]])
        average = average_condition(np.nan, [condition1, condition2])
        self.assertIsNotNone(average)
        self.assertTrue(np.all(average == expected))

    def test_average_ignores_other_nodata(self):
        condition1 = np.array([[1, 2, 3], [4, 5, 6]])
        condition2 = np.array([[11, 12, 13], [np.finfo(np.float32).min, 15, 16]])
        expected = np.array([[6, 7, 8], [4, 10, 11]])
        average = average_condition(
            float(np.finfo(np.float32).min), [condition1, condition2]
        )
        self.assertIsNotNone(average)
        self.assertTrue(np.all(average == expected))

    def test_average_propagates_nans(self):
        condition1 = np.array([[1, 2, 3], [np.nan, 5, 6]])
        condition2 = np.array([[11, 12, 13], [np.nan, 15, 16]])
        expected = np.array([[6, 7, 8], [np.nan, 10, 11]])
        average = average_condition(np.nan, [condition1, condition2])
        self.assertIsNotNone(average)
        if average is not None:
            self.assertTrue(np.all(np.nan_to_num(average) == np.nan_to_num(expected)))

    def test_average_propagates_other_nodata(self):
        condition1 = np.array([[1, 2, 3], [np.finfo(np.float32).min, 5, 6]])
        condition2 = np.array([[11, 12, 13], [np.finfo(np.float32).min, 15, 16]])
        expected = np.array([[6, 7, 8], [np.nan, 10, 11]])
        average = average_condition(
            float(np.finfo(np.float32).min), [condition1, condition2]
        )
        self.assertIsNotNone(average)

        if average is not None:
            self.assertTrue(np.all(np.nan_to_num(average) == np.nan_to_num(expected)))

    def test_nan_not_defined_as_nodata(self):
        condition1 = np.array([[np.nan], [np.nan]])
        condition2 = np.array([[np.nan], [np.nan]])

        self.assertRaises(KeyError, average_condition, 2, [condition1, condition2])


class WeightedAverageTest(unittest.TestCase):
    def test_weighted_average_same_weights(self):
        condition1 = np.array([[1, 2, 3], [4, 5, 6]])
        condition2 = np.array([[11, 12, 13], [14, 15, 16]])
        expected = np.array([[6, 7, 8], [9, 10, 11]])
        average = weighted_average_condition(
            np.nan, [(condition1, 0.5), (condition2, 0.5)]
        )
        self.assertIsNotNone(average)
        self.assertTrue(np.all(average == expected))

    def test_weighted_average_same_weights_ignores_nans(self):
        condition1 = np.array([[1, 2, 3], [4, 5, 6]])
        condition2 = np.array([[11, 12, 13], [np.nan, 15, 16]])
        expected = np.array([[6, 7, 8], [4, 10, 11]])
        average = weighted_average_condition(
            np.nan, [(condition1, 0.5), (condition2, 0.5)]
        )
        self.assertIsNotNone(average)
        self.assertTrue(np.all(average == expected))

    def test_weighted_average_same_weights_propagates_nans(self):
        condition1 = np.array([[1, 2, 3], [np.nan, 5, 6]])
        condition2 = np.array([[11, 12, 13], [np.nan, 15, 16]])
        expected = np.array([[6, 7, 8], [np.nan, 10, 11]])
        average = weighted_average_condition(
            np.nan, [(condition1, 0.5), (condition2, 0.5)]
        )
        self.assertIsNotNone(average)
        if average is not None:
            self.assertTrue(np.all(np.nan_to_num(average) == np.nan_to_num(expected)))

    def test_weighted_average_different_weights(self):
        condition1 = np.array([[1, 2, 3], [4, 5, 6]])
        condition2 = np.array([[11, 12, 13], [14, 15, 16]])
        expected = np.array([[8.5, 9.5, 10.5], [11.5, 12.5, 13.5]])
        average = weighted_average_condition(
            np.nan, [(condition1, 0.25), (condition2, 0.75)]
        )
        self.assertIsNotNone(average)
        self.assertTrue(np.all(average == expected))

    def test_weighted_average_different_weights_ignores_nans(self):
        condition1 = np.array([[1, 2, 3], [4, 5, 6]])
        condition2 = np.array([[11, 12, 13], [np.nan, 15, 16]])
        expected = np.array([[8.5, 9.5, 10.5], [4, 12.5, 13.5]])
        average = weighted_average_condition(
            np.nan, [(condition1, 0.25), (condition2, 0.75)]
        )
        self.assertIsNotNone(average)
        self.assertTrue(np.all(average == expected))

    def test_weighted_average_different_weights_propagates_nans(self):
        condition1 = np.array([[1, 2, 3], [np.nan, 5, 6]])
        condition2 = np.array([[11, 12, 13], [np.nan, 15, 16]])
        expected = np.array([[8.5, 9.5, 10.5], [np.nan, 12.5, 13.5]])
        average = weighted_average_condition(
            np.nan, [(condition1, 0.25), (condition2, 0.75)]
        )
        self.assertIsNotNone(average)
        if average is not None:
            self.assertTrue(np.all(np.nan_to_num(average) == np.nan_to_num(expected)))


class ManagementConditionTest(unittest.TestCase):
    def test_current_condition(self):
        current = np.array([[1, 2, 3], [4, 5, 6]])
        future = np.array([[11, 12, 13], [14, 15, 16]])
        combined = management_condition(current, future, ConditionScoreType.CURRENT)
        self.assertTrue(np.all(current == combined))

    def test_future_condition(self):
        current = np.array([[1, 2, 3], [4, 5, 6]])
        future = np.array([[11, 12, 13], [14, 15, 16]])
        combined = management_condition(current, future, ConditionScoreType.FUTURE)
        self.assertTrue(np.all(future == combined))

    def test_adapt_condition(self):
        current = np.array([[-1, -1, -1], [0, 0, 0], [1, 1, 1]])
        future = np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]])
        combined = management_condition(current, future, ConditionScoreType.ADAPT)
        short = float((np.sqrt(2) - 1) / np.sqrt(2))
        medium = float((np.sqrt(2) - 2) / np.sqrt(2))
        long = float((np.sqrt(2) - np.sqrt(5)) / np.sqrt(2))
        expected = np.array(
            [[medium, short, 1.0], [long, 0.0, short], [-1.0, long, medium]]
        )
        self.assertTrue(np.all(expected == combined))

    def test_monitor_condition(self):
        current = np.array([[-1, -1, -1], [0, 0, 0], [1, 1, 1]])
        future = np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]])
        combined = management_condition(current, future, ConditionScoreType.MONITOR)
        short = float((np.sqrt(2) - 1) / np.sqrt(2))
        medium = float((np.sqrt(2) - 2) / np.sqrt(2))
        long = float((np.sqrt(2) - np.sqrt(5)) / np.sqrt(2))
        expected = np.array(
            [[-1.0, long, medium], [long, 0.0, short], [medium, short, 1.0]]
        )
        self.assertTrue(np.all(expected == combined))

    def test_protect_condition(self):
        current = np.array([[-1, -1, -1], [0, 0, 0], [1, 1, 1]])
        future = np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]])
        combined = management_condition(current, future, ConditionScoreType.PROTECT)
        short = float((np.sqrt(2) - 1) / np.sqrt(2))
        medium = float((np.sqrt(2) - 2) / np.sqrt(2))
        long = float((np.sqrt(2) - np.sqrt(5)) / np.sqrt(2))
        expected = np.array(
            [[medium, long, -1.0], [short, 0.0, long], [1.0, short, medium]]
        )
        self.assertTrue(np.all(expected == combined))

    def test_transform_condition(self):
        current = np.array([[-1, -1, -1], [0, 0, 0], [1, 1, 1]])
        future = np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]])
        combined = management_condition(current, future, ConditionScoreType.TRANSFORM)
        short = float((np.sqrt(2) - 1) / np.sqrt(2))
        medium = float((np.sqrt(2) - 2) / np.sqrt(2))
        long = float((np.sqrt(2) - np.sqrt(5)) / np.sqrt(2))
        expected = np.array(
            [[1.0, short, medium], [short, 0.0, long], [medium, long, -1.0]]
        )
        self.assertTrue(np.all(expected == combined))

    def test_impact_condition(self):
        current = np.array([[-1, -1, -1], [0, 0, 0], [1, 1, 1]])
        future = np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]])
        combined = management_condition(current, future, ConditionScoreType.IMPACT)
        v = (np.sqrt(2) - 2) / np.sqrt(2)
        expected = np.array([[-1, 0, 1], [0, v, 0], [1, 0, -1]])
        self.assertTrue(np.all(np.isclose(expected, combined)))


class ConvertTest(unittest.TestCase):
    def test_no_conversion(self):
        condition = np.array([[1, 2, 3], [4, 5, 6]])
        expected = np.array([[1, 2, 3], [4, 5, 6]])
        converted = convert_nodata_to_nan(np.nan, condition)
        assert converted is not None
        self.assertTrue(np.all(np.nan_to_num(converted) == np.nan_to_num(expected)))

    def test_already_nan(self):
        condition = np.array([[1, 2, 3], [np.nan, 5, 6]])
        expected = np.array([[1, 2, 3], [np.nan, 5, 6]])
        converted = convert_nodata_to_nan(np.nan, condition)
        assert converted is not None
        self.assertTrue(np.all(np.nan_to_num(converted) == np.nan_to_num(expected)))

    def test_value_other_than_nan(self):
        condition = np.array([[1, 2, 3], [999, 5, 6]])
        expected = np.array([[1, 2, 3], [999, 5, 6]])
        converted = convert_nodata_to_nan(np.nan, condition)
        self.assertTrue(np.all(converted == expected))

    def test_contains_nan_but_not_nodata(self):
        condition = np.array([[1, 2, 3], [np.nan, 999, 6]])
        expected = np.array([[1, 2, 3], [np.nan, np.nan, 6]])
        converted = convert_nodata_to_nan(999, condition)
        assert converted is not None
        self.assertTrue(np.all(np.nan_to_num(converted) == np.nan_to_num(expected)))
