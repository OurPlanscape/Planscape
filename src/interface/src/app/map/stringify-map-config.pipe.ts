import { Pipe, PipeTransform } from '@angular/core';

import { MapConfig } from '@types';

/*
 *  Transforms a MapConfig object into a human-readable string
 *  for display at the bottom of a Leaflet map.
 */
@Pipe({
  name: 'stringifyMapConfig',
  pure: false,
})
export class StringifyMapConfigPipe implements PipeTransform {
  transform(mapConfig: MapConfig | undefined): string {
    if (!mapConfig) {
      return '';
    }

    let str: string = '';
    let labels: string[] = [];

    if (
      !!mapConfig.dataLayerConfig.display_name &&
      mapConfig.dataLayerConfig.display_name.length > 0 &&
      mapConfig.dataLayerConfig.display_name != 'None'
    ) {
      let dataLabel = mapConfig.dataLayerConfig.display_name;
      if (mapConfig.dataLayerConfig.normalized) {
        dataLabel = dataLabel.concat(' (Normalized)');
      }
      labels.push(dataLabel);
    }
    if (mapConfig.showExistingProjectsLayer) {
      labels.push('Existing Projects');
    }
    if (
      !!mapConfig.boundaryLayerConfig.boundary_name &&
      mapConfig.boundaryLayerConfig.boundary_name.length > 0
    ) {
      let boundaryLabel = mapConfig.boundaryLayerConfig.display_name
        ? mapConfig.boundaryLayerConfig.display_name
        : mapConfig.boundaryLayerConfig.boundary_name;
      labels.push(boundaryLabel);
    }
    labels.forEach((label, index) => {
      if (index > 0) {
        str = str.concat(' | ');
      }
      str = str.concat(label);
    });
    return str;
  }
}
