"""Functions for computing conditions from lower level conditions.

In the PROMOTe framework, the condition of the landscape is calculated
through a hierarchy of metrics, elements, and pillars.  These functions
generate various conditions using the metadata from the "types"
defined in "base.conditions".

Functions are based either on metadata types, like

  score_metric
  score_element
  score_pillar
  score_region

or on paths, with a PillarConfig as input, like

  score_condition
  average_weighted_score

where a path is a file-like path of region/pillar/element/metric or sub-paths thereof.
"""

import functools
import numpy as np
import os
import rasterio
from typing import Optional, cast

from base.conditions import average_condition, weighted_average_condition
from base.condition_types import ConditionMatrix, ConditionScoreType, Region, Pillar, Element, Metric
from config.conditions_config import PillarConfig


class ConditionReader():
    """Class to read conditions from files."""

    def __init__(self, root_directory: str = '/Users/elsieling/cnra/env'):
        self._root_directory = root_directory

    def read(self, filepath: str, condition_type: ConditionScoreType) -> Optional[ConditionMatrix]:
        """Reads a condition score from the filepath.

        Args:
          filepath: Directory relative to .. containing scores
          condition_type: Which condition to read (CURRENT, FUTURE, IMPACT)
        Returns:
          The condition if found, else None.
        """
        match condition_type:
            case ConditionScoreType.CURRENT:
                # TODO Replace with Interpreted Value file path when available
                file = '_normalized.tif'
            case ConditionScoreType.FUTURE:
                file = 'future.tif'
            case ConditionScoreType.IMPACT:
                file = 'ap_rescale.tif'
            case ConditionScoreType.ADAPT:
                file = 'adapt.tif'
            case ConditionScoreType.MONITOR:
                file = 'monitor.tif'
            case ConditionScoreType.PROTECT:
                file = 'protect.tif'
            case ConditionScoreType.TRANSFORM:
                file = 'transform.tif'
        with rasterio.open(os.path.join(self._root_directory, filepath) + file) as src:
            return src.read(1, out_shape=(1, int(src.height), int(src.width)))


def _summarize(no_data_value: float, input: list[Optional[ConditionMatrix]], operation: str) -> Optional[ConditionMatrix]:
    conditions = [condition for condition in input if condition is not None]
    output = None
    if conditions:
        if len(conditions) == 1:
            output = conditions[0]
        elif operation == 'MIN':
            output = functools.reduce(np.minimum, conditions)
        else:  # MEAN
            output = average_condition(no_data_value, conditions)
    return output


def score_metric(condition_reader: ConditionReader, metric: Metric, condition_type: ConditionScoreType) -> Optional[ConditionMatrix]:
    """Scores the metric by reading the condition from the file. 

    Args:
      metric: The metric to score
      condition_score_type: Which condition type to compute

    Returns:
       The condition score if the metric could be read, or None otherwise.
    """
    if not 'filepath' in metric:
        return None
    return condition_reader.read(metric['filepath'], condition_type) if metric['filepath'] else None


def score_element(condition_reader: ConditionReader, element: Element, condition_type: ConditionScoreType,
                  recompute: bool = False) -> Optional[ConditionMatrix]:
    """Computes the element score.

    Args:
      element: The element to score
      condition_score_type: Which condition type to compute
      recompute: True if the element should be recomputed from the metrics

    Returns:
      The condition score of the element, or None if it could not be computed.
    """
    if not recompute:
        if not 'filepath' in element:
            return None
        return condition_reader.read(element['filepath'], condition_type) if element['filepath'] else None
    metric_conditions = [score_metric(condition_reader, metric, condition_type)
                         for metric in element['metrics']]
    operation = element.get('operation', 'MEAN')
    # TODO: Parameterize the NoData value
    return _summarize(np.nan, metric_conditions, operation if operation else 'MEAN')


def score_pillar(condition_reader: ConditionReader, pillar: Pillar, condition_type: ConditionScoreType,
                 recompute: bool = False) -> Optional[ConditionMatrix]:
    """Computes the pillar score.

    Args:
      pillar: The pillar to score
      condition_score_type: Which condition type to compute
      recompute: True if the pillar should be recomputed from the elements, which in turn are recomputed
        from metrics.  If any of the elements cannot be recomputed (e.g., because the file of a metric is
        missing), the computation falls back to using the file associated with the element.

    Returns:
      The condition score of the pillar, or None if it could not be computed.
    """
    if not recompute:
        if not 'filepath' in pillar:
            return None
        return condition_reader.read(pillar['filepath'], condition_type) if pillar['filepath'] else None
    element_conditions: list[Optional[ConditionMatrix]] = []
    for element in pillar['elements']:
        element_score = score_element(
            condition_reader, element, condition_type, True)
        if element_score is None:
            element_score = score_element(
                condition_reader, element, condition_type, False)
        element_conditions.append(element_score)
    operation = pillar.get('operation', 'MEAN')
    # TODO: Parameterize the NoData value
    return _summarize(np.nan, element_conditions, operation if operation else 'MEAN')


def score_region(condition_reader: ConditionReader, region: Region, condition_type: ConditionScoreType,
                 recompute: bool = False) -> Optional[ConditionMatrix]:
    """Computes the region score.

    This computes the "Evaluation Score", which does a weighted average of the 

    Args:
      region: The region to score
      condition_score_type: Which condition type to compute
      recompute: True if the region should be recomputed from the elements

    Returns:
      The condition score of the region, or None if it could not be computed.
    """
    if not recompute:
        if not 'filepath' in region:
            return None
        return condition_reader.read(region['filepath'], condition_type) if region['filepath'] else None
    return None  # TODO(riecke) Finish this with the "evaluation statistic"


def score_condition(config: PillarConfig, condition_reader: ConditionReader, condition_path: str,
                    condition_type: ConditionScoreType, recompute: bool = False) -> Optional[ConditionMatrix]:
    """Computes the condition from a path.

    The path should be of one of the following forms, with "/" as the separator:
       region (averaging the pillars)
       region/pillar
       region/pillar/element
       region/pillar/element/metric

    Args:
      condition_path: The path to the condition
      condition_score_type: Which condition type to compute
      recompute: True if the pillar should be recomputed from the elements

    Returns:
      The condition score, or None if it could not be computed.
    """
    path = condition_path.split('/')
    match path:
        case [region_name]:
            region = config.get_region(region_name)
            if region is None:
                return None
            return score_region(condition_reader, region, condition_type, recompute)
        case [region_name, pillar_name]:
            pillar = config.get_pillar(region_name, pillar_name)
            if pillar is None:
                return None
            return score_pillar(condition_reader, pillar, condition_type, recompute)
        case [region_name, pillar_name, element_name]:
            element = config.get_element(
                region_name, pillar_name, element_name)
            if element is None:
                return None
            return score_element(condition_reader, element, condition_type, recompute)
        case [region_name, pillar_name, element_name, metric_name]:
            metric = config.get_metric(
                region_name, pillar_name, element_name, metric_name)
            if metric is None:
                return None
            return score_metric(condition_reader, metric, condition_type)
        case _:
            return None


def average_weighted_scores(config: PillarConfig, condition_reader: ConditionReader, weights: dict[str, float],
                            condition_type: ConditionScoreType, recompute=False) -> Optional[ConditionMatrix]:
    conditions = [(score_condition(config, condition_reader, path, condition_type,
                   recompute), weights[path]) for path in weights.keys()]
    for (condition, _) in conditions:
        if condition is None:
            return None
    return weighted_average_condition(np.nan, cast(list[tuple[ConditionMatrix, float]], conditions))
