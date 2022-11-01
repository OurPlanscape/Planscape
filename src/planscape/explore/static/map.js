const hillshade = L.tileLayer('https://api.mapbox.com/styles/v1/tsuga11/ckcng1sjp2kat1io3rv2croyl/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoidHN1Z2ExMSIsImEiOiJjanFmaTA5cGIyaXFoM3hqd3R5dzd3bzU3In0.TFqMjIIYtpcyhzNh4iMcQA', {
    zIndex: 0,
    tileSize: 512,
    zoomOffset: -1
});

const map = L.map("map", { layers: [hillshade, osm] });

// Fit to the TCSI region
map.fitBounds([
    [38.614, -121.220],
    [39.678, -119.876]
]);


// Render functions
async function render_calmapper_layer() {
  var data = JSON.parse(existing_projects)

  // [elsieling] This step makes the map less responsive
  var existing_projects_layer = L.geoJSON(data, {
      style: function(feature) {
        return {
          "color": "#000000",
          "weight": 3,
          "opacity": 0.9
        }
      },
      onEachFeature: function(feature, layer) {
        layer.bindPopup('Name: ' + feature.properties.PROJECT_NAME + '<br>' + 
        'Status: ' + feature.properties.PROJECT_STATUS);
      }
    }
  ).addTo(map);
  
  controlLayers.addOverlay(existing_projects_layer, 'CalMAPPER projects');
}

async function load_markers() {
  const markers_url = `/api/markers/?in_bbox=${map
      .getBounds()
      .toBBoxString()}`;
  const response = await fetch(markers_url);
  const geojson = await response.json();
  return geojson;
}

async function load_tcsi_huc12() {
  const tcsi_huc12_url = `/api/tcsi_huc12/?in_bbox=${map
      .getBounds()
      .toBBoxString()}`;
  const response = await fetch(tcsi_huc12_url);
  const geojson = await response.json();
  return geojson;
}
async function render_markers() {
  const markers = await load_markers();
  L.geoJSON(markers)
      .bindPopup((layer) => layer.feature.properties.name)
      .addTo(map);
}
async function render_huc12() {
  const boundaries = await load_tcsi_huc12();
  var huc12_layer = L.geoJSON(boundaries).addTo(map);
/*
  {
      onEachFeature: function onEachFeature(feature, layer) {
        var props = feature.properties;
        var content = `<img width="300" src="${props.picture_url}"/><h3>${props.title}</h3><p>${props.description}</p>`;
        layer.bindPopup(content);
    }}).addTo(map);
    */

    controlLayers.addOverlay(huc12_layer, 'HUC-12');
}



