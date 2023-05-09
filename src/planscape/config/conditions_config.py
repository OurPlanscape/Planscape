""" Class for parsing, validating, and accessing components in the configuration file.

Example usage:
  try:
    config = PillarConfig("config.json")
    element = config.get_element("tcsi", "fire_dynamics", "fire_security")
  except ValueError as err:
    print(err)
"""
import json
from typing import List, Optional, Tuple

from base.condition_types import Element, Metric, Pillar, Region
from base.region_name import RegionName


class PillarConfig:
    """
    Class wrapping the configuration of regions, pillars, elements, and metrics.
    This is represented as a multi-level dictionary.  The top level is the region
    dictionary, mapping region names to data about the region.  Each region contains
    a list of pillars, each of which is also a dictionary, etc.
    """

    # Keys in the dictionaries.
    COMMON_METADATA = {'filepath', 'display_name', 'data_provider', 
                       'colormap', 'max_value', 'min_value','layer', 'normalized_layer', 'normalized_data_download_path'}
    REGION_KEYS = {'region_name', 'pillars'}.union(COMMON_METADATA)
    PILLAR_KEYS = {'pillar_name',
                   'elements',
                   'operation',
                   'future_layer',
                   'future_data_download_path',
                   'display'}.union(COMMON_METADATA)
    ELEMENT_KEYS = {'element_name',
                    'metrics',
                    'operation',
                    'display'}.union(COMMON_METADATA)
    METRIC_KEYS = {'metric_name',
                   'current_conditions_only',
                   'ignore',
                   'source',
                   'source_link',
                   'data_download_link',
                   'raw_layer',
                   'raw_data_download_path',
                   'data_year',
                   'reference_link',
                   'invert_raw',
                   'data_units'}.union(COMMON_METADATA)

    @classmethod
    def build_condition_metadata(cls, config: list[Region]):
        """
        Builds a dictionary containing metadata about all the conditions.
        """
        metadata = dict()

        def update_metadata(name, filepath, layer, raw_layer, normalized_layer, future_layer, min_value, max_value, data_units):
            if filepath is not None:
                key = filepath.split('/')[-1]
                metadata[key + '.tif'] = {'name': name,
                                          'min_value': min_value,
                                          'max_value': max_value}
                if data_units is not None:
                    metadata[key + '.tif']['data_units'] = data_units
                if layer is not None:
                    metadata[key+'.tif']['layer'] = layer
                if raw_layer is not None:
                    metadata[key+'.tif']['raw_layer'] = raw_layer
                if normalized_layer is not None:
                    metadata[key+'.tif']['normalized_layer'] = normalized_layer
                if future_layer is not None:
                    metadata[key+'.tif']['future_layer'] = future_layer

        for region in config:
            for pillar in region['pillars']:
                update_metadata(pillar['pillar_name'],
                                pillar.get('filepath', None),pillar.get('layer',None), pillar.get('raw_layer', None), pillar.get('normalized_layer', None), pillar.get('future_layer', None),  -1, 1, None)
                for element in pillar['elements']:
                    update_metadata(element['element_name'], element.get(
                        'filepath', None), element.get('layer', None), None, element.get('normalized_layer', None), None, -1, 1, None)
                    for metric in element['metrics']:
                        min = metric.get('min_value', -1)
                        max = metric.get('max_value', 1)
                        data_units = metric.get('data_units', None)
                        update_metadata(metric['metric_name'], metric.get(
                            'filepath', None), metric.get('layer', None), metric.get('raw_layer', None), metric.get('normalized_layer', None), None, min, max, data_units)
        return metadata

    def __init__(self, filename: str):
        with open(filename, "r") as stream:
            try:
                self._config = json.load(stream)
            except json.JSONDecodeError as exc:
                raise ValueError(
                    "Could not parse JSON file; exception was " + str(exc))
            if not self.check_config():
                raise ValueError("Illegal structure in JSON configuration.")
            self._condition_metadata = PillarConfig.build_condition_metadata(
                self._config['regions'])

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
                    region.keys() <= PillarConfig.REGION_KEYS and
                    isinstance(RegionName(region['region_name']), RegionName) and
                    isinstance(region['pillars'], list) and
                    all([check_pillar(pillar) for pillar in region['pillars']]))

        def check_pillar(pillar) -> bool:
            return (isinstance(pillar, dict) and
                    pillar.keys() <= PillarConfig.PILLAR_KEYS and
                    isinstance(pillar['pillar_name'], str) and
                    isinstance(pillar['elements'], list) and
                    all([check_element(element) for element in pillar['elements']]))

        def check_element(element) -> bool:
            return (isinstance(element, dict) and
                    element.keys() <= PillarConfig.ELEMENT_KEYS and
                    isinstance(element['element_name'], str) and
                    isinstance(element['metrics'], list) and
                    all([check_metric(metric) for metric in element['metrics']]))

        def check_metric(metric) -> bool:
            return (isinstance(metric, dict) and
                    metric.keys() <= PillarConfig.METRIC_KEYS and
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

    def get_min_max_values(self, name: str) -> Tuple[int, int]:
        metadata = self._condition_metadata.get(name, None)
        if metadata is None:
            return (-1, 1)
        return (metadata.get('min_value', -1), metadata.get('max_value', 1))

    def get_data_units(self, name: str) -> Optional[str]:
        metadata = self._condition_metadata.get(name, None)
        if metadata is None:
            return None
        return metadata.get('data_units', None)
