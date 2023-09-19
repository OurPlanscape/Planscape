""" Tests for the conditions.py file. """

import logging
import numpy as np
from typing import Optional, Tuple
import unittest

from base.condition_types import (
    ConditionMatrix,
    ConditionScoreType,
    Region,
    Pillar,
    Element,
    Metric,
)
import config.conditions_config as pc
import eval.compute_conditions as cc
from eval.raster_data import RasterData


class FakeConditionReader(cc.ConditionReader):
    def read(
        self, filepath: str, condition_type: ConditionScoreType
    ) -> Optional[RasterData]:
        match condition_type:
            case ConditionScoreType.CURRENT:
                return RasterData(np.array([[1, 2, 3], [4, 5, 6]]), "")
            case ConditionScoreType.FUTURE:
                return RasterData(np.array([[10, 2, 3], [4, 5, 6]]), "")
            case ConditionScoreType.IMPACT:
                if filepath == "special":
                    return RasterData(np.array([[-1, 2, 3], [-4, 5, 6]]), "")
                return RasterData(np.array([[1, 20, 3], [4, 5, 6]]), "")
            case ConditionScoreType.ADAPT:
                return RasterData(np.array([[1, 2, 30], [4, 5, 6]]), "")
            case ConditionScoreType.MONITOR:
                return RasterData(np.array([[1, 2, 3], [40, 5, 6]]), "")
            case ConditionScoreType.PROTECT:
                return RasterData(np.array([[1, 20, 3], [4, 50, 6]]), "")
            case ConditionScoreType.TRANSFORM:
                return RasterData(np.array([[1, 2, 3], [4, 5, 60]]), "")


class ScoreMetricTest(unittest.TestCase):
    def test_score_metric_no_file_returns_none(self):
        metric: Metric = {"metric_name": "metric"}
        condition = cc.score_metric(
            FakeConditionReader(), metric, ConditionScoreType.ADAPT
        )
        self.assertIsNone(condition)

    def test_score_metric_with_file_returns_not_none(self):
        metric: Metric = {"metric_name": "metric", "filepath": "path/to/file"}
        condition = cc.score_metric(
            FakeConditionReader(), metric, ConditionScoreType.IMPACT
        )
        self.assertIsNotNone(condition)


class ScoreElementTest(unittest.TestCase):
    def test_score_element_no_file_returns_none(self):
        element: Element = {"element_name": "element", "metrics": []}
        computed_element = cc.score_element(
            FakeConditionReader(), element, ConditionScoreType.ADAPT
        )
        self.assertIsNone(computed_element)

    def test_score_element_with_file_returns_not_none(self):
        element: Element = {
            "element_name": "element",
            "metrics": [],
            "filepath": "path/to/file",
        }
        self.assertIsNotNone(
            cc.score_element(FakeConditionReader(), element, ConditionScoreType.IMPACT)
        )

    def test_recompute_element_empty_metrics_returns_none(self):
        element: Element = {"element_name": "element", "metrics": []}
        computed_element = cc.score_element(
            FakeConditionReader(), element, ConditionScoreType.IMPACT, recompute=True
        )
        self.assertIsNone(computed_element)

    def test_recompute_element_one_metric(self):
        metric: Metric = {"metric_name": "metric", "filepath": "path/to/file"}
        element: Element = {"element_name": "element", "metrics": [metric]}
        computed_element = cc.score_element(
            FakeConditionReader(), element, ConditionScoreType.IMPACT, recompute=True
        )
        self.assertIsNotNone(computed_element)
        if computed_element is not None:
            self.assertTrue(
                np.all(computed_element.raster == np.array([[1, 20, 3], [4, 5, 6]]))
            )

    def test_recompute_element_two_metrics_mean(self):
        metric1: Metric = {"metric_name": "metric", "filepath": "path/to/file"}
        metric2: Metric = {"metric_name": "metric", "filepath": "special"}
        element: Element = {"element_name": "element", "metrics": [metric1, metric2]}
        computed_element = cc.score_element(
            FakeConditionReader(), element, ConditionScoreType.IMPACT, recompute=True
        )
        self.assertIsNotNone(computed_element)
        if computed_element is not None:
            self.assertTrue(
                np.all(computed_element.raster == np.array([[0, 11, 3], [0, 5, 6]]))
            )

    def test_recompute_element_two_metrics_min(self):
        metric1: Metric = {"metric_name": "metric", "filepath": "path/to/file"}
        metric2: Metric = {"metric_name": "metric", "filepath": "special"}
        element: Element = {
            "element_name": "element",
            "metrics": [metric1, metric2],
            "operation": "MIN",
        }
        computed_element = cc.score_element(
            FakeConditionReader(), element, ConditionScoreType.IMPACT, recompute=True
        )
        self.assertIsNotNone(computed_element)
        if computed_element is not None:
            self.assertTrue(
                np.all(computed_element.raster == np.array([[-1, 2, 3], [-4, 5, 6]]))
            )


class ScorePillarTest(unittest.TestCase):
    def test_score_pillar_no_file_returns_none(self):
        pillar: Pillar = {"pillar_name": "pillar", "elements": []}
        self.assertIsNone(
            cc.score_pillar(FakeConditionReader(), pillar, ConditionScoreType.ADAPT)
        )

    def test_score_pillar_with_file_returns_not_none(self):
        pillar: Pillar = {
            "pillar_name": "pillar",
            "elements": [],
            "filepath": "path/to/file",
        }
        self.assertIsNotNone(
            cc.score_pillar(FakeConditionReader(), pillar, ConditionScoreType.IMPACT)
        )

    def test_recompute_pillar_empty_metrics_returns_none(self):
        pillar: Pillar = {"pillar_name": "pillar", "elements": []}
        self.assertIsNone(
            cc.score_pillar(
                FakeConditionReader(), pillar, ConditionScoreType.IMPACT, recompute=True
            )
        )

    def test_recompute_pillar_one_metric(self):
        metric: Metric = {"metric_name": "metric", "filepath": "path/to/file"}
        element: Element = {
            "element_name": "element",
            "metrics": [metric],
            "operation": "MIN",
        }
        pillar: Pillar = {"pillar_name": "pillar", "elements": [element]}
        score = cc.score_pillar(
            FakeConditionReader(), pillar, ConditionScoreType.IMPACT, recompute=True
        )
        self.assertIsNotNone(score)
        if score is not None:
            self.assertTrue(np.all(score.raster == np.array([[1, 20, 3], [4, 5, 6]])))

    def test_recompute_pillar_two_metrics_mean(self):
        metric1: Metric = {"metric_name": "metric", "filepath": "path/to/file"}
        metric2: Metric = {"metric_name": "metric", "filepath": "special"}
        element: Element = {
            "element_name": "element",
            "metrics": [metric1, metric2],
            "operation": "MEAN",
        }
        pillar: Pillar = {"pillar_name": "pillar", "elements": [element]}
        score = cc.score_pillar(
            FakeConditionReader(), pillar, ConditionScoreType.IMPACT, recompute=True
        )
        self.assertIsNotNone(score)
        if score is not None:
            self.assertTrue(np.all(score.raster == np.array([[0, 11, 3], [0, 5, 6]])))

    def test_recompute_pillar_two_metrics_min(self):
        metric1: Metric = {"metric_name": "metric", "filepath": "path/to/file"}
        metric2: Metric = {"metric_name": "metric", "filepath": "special"}
        element: Element = {
            "element_name": "element",
            "metrics": [metric1, metric2],
            "operation": "MIN",
        }
        pillar: Pillar = {"pillar_name": "pillar", "elements": [element]}
        score = cc.score_pillar(
            FakeConditionReader(), pillar, ConditionScoreType.IMPACT, recompute=True
        )
        self.assertIsNotNone(score)
        if score is not None:
            self.assertTrue(np.all(score.raster == np.array([[-1, 2, 3], [-4, 5, 6]])))

    def test_recompute_pillar_fallback_to_element(self):
        metric1: Metric = {"metric_name": "metric", "filepath": "path/to/file"}
        metric2: Metric = {"metric_name": "metric"}
        element: Element = {
            "element_name": "element",
            "metrics": [metric1, metric2],
            "operation": "MIN",
            "filepath": "path/to/element",
        }
        pillar: Pillar = {"pillar_name": "pillar", "elements": [element]}
        score = cc.score_pillar(
            FakeConditionReader(), pillar, ConditionScoreType.IMPACT, recompute=True
        )
        self.assertIsNotNone(score)
        if score is not None:
            self.assertTrue(np.all(score.raster == np.array([[1, 20, 3], [4, 5, 6]])))

    def test_recompute_pillar_fallback_to_element_two_elements(self):
        metric1: Metric = {"metric_name": "metric", "filepath": "special"}
        metric2: Metric = {"metric_name": "metric", "filepath": "path/to/metric"}
        element1: Element = {"element_name": "element", "metrics": [metric1, metric2]}
        element2: Element = {
            "element_name": "element",
            "metrics": [],
            "filepath": "path/to/element",
        }
        pillar: Pillar = {
            "pillar_name": "pillar",
            "elements": [element1, element2],
            "operation": "MEAN",
        }
        score = cc.score_pillar(
            FakeConditionReader(), pillar, ConditionScoreType.IMPACT, recompute=True
        )
        self.assertIsNotNone(score)
        if score is not None:
            self.assertTrue(
                np.all(score.raster == np.array([[0.5, 15.5, 3], [2, 5, 6]]))
            )


class ScoreConditionTest(unittest.TestCase):
    class FakePillarConfig(pc.PillarConfig):
        def __init__(self, filename: str):
            self._metric1: Metric = {"metric_name": "metric1", "filepath": "special"}
            self._metric2: Metric = {
                "metric_name": "metric2",
                "filepath": "path/to/metric",
            }
            self._element1: Element = {
                "element_name": "element1",
                "metrics": [self._metric1, self._metric2],
            }
            self._element2: Element = {
                "element_name": "element2",
                "metrics": [],
                "filepath": "path/to/element",
            }
            self._pillar: Pillar = {
                "pillar_name": "pillar",
                "elements": [self._element1, self._element2],
                "operation": "MEAN",
                "filepath": "path/to/pillar",
            }

        def get_region(self, region_name: str) -> Optional[Region]:
            return None

        def get_pillar(self, region_name: str, pillar_name: str) -> Optional[Pillar]:
            match pillar_name:
                case "pillar":
                    return self._pillar
                case _:
                    return None

        def get_element(
            self, region_name: str, pillar_name: str, element_name: str
        ) -> Optional[Element]:
            match element_name:
                case "element1":
                    return self._element1
                case "element2":
                    return self._element2
                case _:
                    return None

        def get_metric(
            self,
            region_name: str,
            pillar_name: str,
            element_name: str,
            metric_name: str,
        ) -> Optional[Metric]:
            match metric_name:
                case "metric1":
                    return self._metric1
                case "metric2":
                    return self._metric2
                case _:
                    return None

    def test_score_condition_unknown_pillar_returns_none(self):
        self.assertIsNone(
            cc.score_condition(
                self.FakePillarConfig(""),
                FakeConditionReader(),
                "region/pillar1",
                ConditionScoreType.ADAPT,
            )
        )

    def test_score_condition_known_pillar_returns_value(self):
        pillar_config = self.FakePillarConfig("")
        pillar = pillar_config.get_pillar("region", "pillar")
        score = cc.score_condition(
            pillar_config,
            FakeConditionReader(),
            "region/pillar",
            ConditionScoreType.ADAPT,
        )
        self.assertIsNotNone(score)
        self.assertIsNotNone(pillar)
        if pillar is not None:
            expected = cc.score_pillar(
                FakeConditionReader(), pillar, ConditionScoreType.ADAPT
            )
            self.assertTrue(np.all(score == expected.raster))

    def test_score_condition_unknown_element_returns_none(self):
        self.assertIsNone(
            cc.score_condition(
                self.FakePillarConfig(""),
                FakeConditionReader(),
                "region/pillar/element",
                ConditionScoreType.ADAPT,
            )
        )

    def test_score_condition_known_element_returns_value(self):
        pillar_config = self.FakePillarConfig("")
        element = pillar_config.get_element("region", "pillar", "element1")
        score = cc.score_condition(
            pillar_config,
            FakeConditionReader(),
            "region/pillar/element1",
            ConditionScoreType.IMPACT,
            recompute=True,
        )
        self.assertIsNotNone(score)
        self.assertIsNotNone(element)
        if element is not None:
            expected = cc.score_element(
                FakeConditionReader(),
                element,
                ConditionScoreType.IMPACT,
                recompute=True,
            )
            self.assertTrue(np.all(score == expected.raster))

    def test_score_condition_unknown_metric_returns_none(self):
        self.assertIsNone(
            cc.score_condition(
                self.FakePillarConfig(""),
                FakeConditionReader(),
                "region/pillar/element1/metric",
                ConditionScoreType.ADAPT,
            )
        )

    def test_score_condition_known_metric_returns_value(self):
        pillar_config = self.FakePillarConfig("")
        metric = pillar_config.get_metric("region", "pillar", "element2", "metric1")
        score = cc.score_condition(
            pillar_config,
            FakeConditionReader(),
            "region/pillar/element2/metric1",
            ConditionScoreType.ADAPT,
        )
        self.assertIsNotNone(score)
        self.assertIsNotNone(metric)

        if metric is not None:
            condition = cc.score_metric(
                FakeConditionReader(), metric, ConditionScoreType.ADAPT
            )
            self.assertTrue(np.all(score == condition.raster))
