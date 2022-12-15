""" Class for parsing, validating, and accessing components in the configuration file.

Example usage:
  try:
    config = PillarConfig("config.json")
    element = config.get_element("tcsi", "fire_dynamics", "fire_security")
  except ValueError as err:
    print(err)
"""
import json
from typing import List, Optional

from base.condition_types import Element, Metric, Pillar, Region
from base.region_name import RegionName


class PillarConfig:
    """
    Class wrapping the configuration of regions, pillars, elements, and metrics.
    """

    def __init__(self, filename: str):
        with open(filename, "r") as stream:
            try:
                self._config = json.load(stream)
            except json.JSONDecodeError as exc:
                raise ValueError(
                    "Could not parse JSON file; exception was " + str(exc))
            if not self.check_config():
                raise ValueError("Illegal structure in JSON configuration.")

    def check_config(self) -> bool:
        """Checks the structure of the configuration.
        Returns:
            True if the configuration matches the right structure.
        """
        def check_regions(regionlist) -> bool:
            return (isinstance(regionlist, list) and
                    all([check_region(region) for region in regionlist]))

        def check_region(region) -> bool:
            return (isinstance(region, dict) and
                    region.keys() <= set(['region_name', 'pillars', 'filepath', 'display_name', 'colormap']) and
                    isinstance(RegionName(region['region_name']), RegionName) and
                    isinstance(region['pillars'], list) and
                    all([check_pillar(pillar) for pillar in region['pillars']]))

        def check_pillar(pillar) -> bool:
            return (isinstance(pillar, dict) and
                    pillar.keys() <= {'pillar_name', 'elements', 'operation', 'filepath', 'display_name', 'display', 'colormap'} and
                    isinstance(pillar['pillar_name'], str) and
                    isinstance(pillar['elements'], list) and
                    all([check_element(element) for element in pillar['elements']]))

        def check_element(element) -> bool:
            return (isinstance(element, dict) and
                    element.keys() <= {'element_name', 'metrics', 'operation', 'filepath', 'display_name', 'colormap'} and
                    isinstance(element['element_name'], str) and
                    isinstance(element['metrics'], list) and
                    all([check_metric(metric) for metric in element['metrics']]))

        def check_metric(metric) -> bool:
            return (isinstance(metric, dict) and
                    metric.keys() <= {'metric_name', 'filepath', 'display_name', 'current_conditions_only', 'colormap', 'ignore'} and
                    isinstance(metric['metric_name'], str))

        return 'regions' in self._config and check_regions(self._config['regions'])

    def get_region(self, region_name: str) -> Optional[Region]:
        """Gets the named region from the configuration.

        Args:
          region_name: name of the region

        Returns:
          The region or None if no such region exists.
        """
        for region in self._config['regions']:
            if region['region_name'] == region_name:
                return region
        return None

    def get_regions(self) -> List[Region]:
        return self._config['regions']

    def get_pillars(self, region: Region) -> List[Pillar]:
        return region['pillars']

    def get_elements(self, pillar: Pillar) -> List[Element]:
        return pillar['elements']

    def get_metrics(self, element: Element) -> List[Metric]:
        return element['metrics']

    def get_pillar(self, region_name: str, pillar_name: str) -> Optional[Pillar]:
        """Gets a pillar from the configuration.

        Args:
          region_name: name of the region
          pillar_name: name of the pillar

        Returns:
          The pillar or None if no such pillar exists.
        """

        region = self.get_region(region_name)
        if not region:
            return None
        for pillar in region['pillars']:
            if pillar['pillar_name'] == pillar_name:
                return pillar
        return None

    def get_element(self, region_name: str, pillar_name: str, element_name: str) -> Optional[Element]:
        """Gets an element from the configuration.

        Args:
          region_name: name of the region
          pillar_name: name of the pillar
          element_name: name of the element

        Returns:
          The element or None if no such element exists.
        """

        pillar = self.get_pillar(region_name, pillar_name)
        if not pillar:
            return None
        for element in pillar['elements']:
            if element['element_name'] == element_name:
                return element
        return None

    def get_metric(self, region_name: str, pillar_name: str, element_name: str, metric_name: str) -> Optional[Metric]:
        """Gets a metric from the configuration.

        Args:
          region_name: name of the region
          pillar_name: name of the pillar
          element_name: name of the element
          metric_name: name of the metric

        Returns:
          The metric or None if no metric exists.
        """

        element = self.get_element(region_name, pillar_name, element_name)
        if not element:
            return None
        for metric in element['metrics']:
            if metric['metric_name'] == metric_name:
                return metric
        return None
