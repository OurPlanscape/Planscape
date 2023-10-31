import { Feature, FeatureCollection } from 'geojson';
import * as L from 'leaflet';
import booleanWithin from '@turf/boolean-within';

/**
 * todo update with
 * booleanWithin(feature1: Feature<any> | Geometry, feature2: Feature<any> | Geometry): boolean;
 *
 * @param area
 * @param boundaries
 *
 * feature1: Feature<any> | Geometry, feature2: Feature<any> | Geometry
 */
export function checkIfAreaInBoundaries(
  area: FeatureCollection,
  boundaries: Feature
): boolean {
  let overlappingAreas = area.features.map((feature) => {
    return !booleanWithin(feature, boundaries);
  });
  return !overlappingAreas.some((overlap) => overlap);
}

export function createLegendHtmlElement(
  colormap: any,
  dataUnit: string | undefined
) {
  var entries = colormap['entries'];
  const div = L.DomUtil.create('div', 'legend');
  // htmlContent of HTMLDivElement must be directly added here to add to leaflet map
  // Creating a string and then assigning to div.innerHTML to allow for class encapsulation
  // (otherwise div tags are automatically closed before they should be)
  var htmlContent = '';
  htmlContent += '<div class=parentlegend>';
  if (dataUnit && colormap['type'] == 'ramp') {
    // For legends with numerical labels make header the corresponding data units
    htmlContent += '<div><b>' + dataUnit + '</b></div>';
  } else {
    // For legends with categorical labels make header 'Legend'
    htmlContent += '<div><b>Legend</b></div>';
  }
  // Reversing order to present legend values from high to low (default is low to high)
  for (let i = entries.length - 1; i >= 0; i--) {
    var entry = entries[i];
    // Add a margin-bottom to only the last entry in the legend
    var lastChild = '';
    if (i == 0) {
      lastChild = 'style="margin-bottom: 6px;"';
    }
    if (entry['label']) {
      // Filter out 'nodata' entries
      if (entry['color'] != '#000000') {
        htmlContent +=
          '<div class="legendline" ' +
          lastChild +
          '><i style="background:' +
          entry['color'] +
          '"> &emsp; &hairsp;</i> &nbsp;<label>' +
          entry['label'] +
          '<br/></label></div>';
      } else if (lastChild != '') {
        htmlContent += '<div class="legendline"' + lastChild + '></div>';
      }
    } else {
      htmlContent +=
        '<div class="legendline" ' +
        lastChild +
        '><i style="background:' +
        entry['color'] +
        '"> &emsp; &hairsp;</i> &nbsp; <br/></div>';
    }
  }
  htmlContent += '</div>';
  div.innerHTML = htmlContent;
  return div;
}
