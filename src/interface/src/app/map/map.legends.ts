import * as L from 'leaflet';
import { DEFAULT_COLORMAP, Map, NONE_COLORMAP } from '@types';

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
      if (entry['opacity'] != '0.0') {
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
    } else if (entry['opacity'] != '0.0') {
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

export function createAndAddLegend(
  colormap: any,
  dataUnit: string | undefined,
  map: Map
) {
  const legend = new (L.Control.extend({
    options: { position: 'topleft' },
  }))();
  const mapRef = map;
  legend.onAdd = function (map) {
    // Remove any pre-existing legend on map
    if (mapRef.legend) {
      L.DomUtil.remove(mapRef.legend);
    }

    const div = createLegendHtmlElement(colormap, dataUnit);
    // Needed to allow for scrolling on the legend
    L.DomEvent.on(div, 'mousewheel', L.DomEvent.stopPropagation);
    // Set reference to legend for later deletion
    mapRef.legend = div;
    return div;
  };
  legend.addTo(map.instance!);
}

export function updateLegendWithColorMap(
  map: Map,
  colormap?: string,
  minMaxValues?: (number | undefined)[]
) {
  if (colormap == undefined) {
    colormap = DEFAULT_COLORMAP;
  } else if (colormap == NONE_COLORMAP) {
    map.legend = undefined;
    return;
  }
}
