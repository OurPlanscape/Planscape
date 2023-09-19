"""Classes (really structs) for describing different kinds of conditions.

In the PROMOTe framework, the condition of the landscape is calculated
through a hierarchy of metrics, elements, and pillars.  The types describe
the metadata of this hierarchy.

Types defined:
  Condition:          2-dimensional matrix of values in the [-1, 1] range.
  ConditionLevel:     Level of the PROMOTe hierarchy.
  ConditionScoreType: Different types of conditions.
  Metric:             Base conditions from the PROMOTe framework.
  Element:            A condition that is the result of combining metrics.
  Pillar:             A condition that is the result of combining elements.
  Region:             Collected pillar conditions of a region.
"""

import enum
from typing import TypedDict
from xmlrpc.client import boolean

import numpy as np
import numpy.typing as npt
from typing_extensions import NotRequired

ConditionMatrix = npt.NDArray[np.float32]


class ConditionLevel(enum.IntEnum):
    """Level of the hierarchy of the condition."""

    ECOSYSTEM = 0  # An average of the Pillar condition scores.
    PILLAR = 1
    ELEMENT = 2
    METRIC = 3


class ConditionScoreType(enum.IntEnum):
    """Types of condition scores."""

    CURRENT = 0
    FUTURE = 1
    IMPACT = 2
    ADAPT = 3
    MONITOR = 4
    PROTECT = 5
    TRANSFORM = 6


class Metric(TypedDict):
    metric_name: str
    filepath: NotRequired[str]
    display_name: NotRequired[str]
    current_conditions_only: NotRequired[boolean]
    colormap: NotRequired[str]
    min_value: NotRequired[int]
    max_value: NotRequired[int]
    invert_raw: NotRequired[bool]


class Element(TypedDict):
    element_name: str
    metrics: list[Metric]
    operation: NotRequired[str]
    filepath: NotRequired[str]
    display_name: NotRequired[str]
    colormap: NotRequired[str]


class Pillar(TypedDict):
    pillar_name: str
    elements: list[Element]
    operation: NotRequired[str]
    filepath: NotRequired[str]
    display_name: NotRequired[str]
    colormap: NotRequired[str]
    display: NotRequired[bool]


class Region(TypedDict):
    region_name: str
    pillars: list[Pillar]
    filepath: NotRequired[str]
    display_name: NotRequired[str]
    colormap: NotRequired[str]
