import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { BoundaryService } from '../boundary.service';
import { PopupService } from '../popup.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements AfterViewInit {
  private map!: L.Map;
  private boundary!: any;

  private initMap(): L.Control.Layers {
    const hillshade_tiles = L.tileLayer('https://api.mapbox.com/styles/v1/tsuga11/ckcng1sjp2kat1io3rv2croyl/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoidHN1Z2ExMSIsImEiOiJjanFmaTA5cGIyaXFoM3hqd3R5dzd3bzU3In0.TFqMjIIYtpcyhzNh4iMcQA', {
      zIndex: 0,
      tileSize: 512,
      zoomOffset: -1
    });

    const open_street_maps_tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    });

    this.map = L.map('map', {
      center: [38.646, -120.548],
      zoom: 9,
      layers: [hillshade_tiles, open_street_maps_tiles],
    });

    // Show overlay controls
    var controlLayers = L.control.layers({}, {}, {collapsed:false}).addTo(this.map);
    controlLayers.setPosition('bottomleft')

    controlLayers.addBaseLayer(hillshade_tiles, "Hillshade");
    controlLayers.addBaseLayer(open_street_maps_tiles, "OpenStreetMap");
    return controlLayers;
  }

  constructor(private boundaryService: BoundaryService, private popupService: PopupService) {}

  // Queries the CalMAPPER ArcGIS Web Feature Service for known land management projects without filtering. Renders the project boundaries + metadata in a popup in an optional layer.
  private async initCalMapperLayer(layers: L.Control.Layers) {
    const params = {
        'where': '1=1',
        'outFields' : 'PROJECT_NAME,PROJECT_STATUS',
        'f': 'GEOJSON'
    }

    const url = "https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/ArcGIS/rest/services/CMDash_v3_view/FeatureServer/2/query?" + new URLSearchParams(params).toString();
    const response = await fetch(url);
    const data = await response.json();

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
    ).addTo(this.map);

    this.map.addLayer(existing_projects_layer);
    layers.addOverlay(existing_projects_layer, "CalMAPPER Projects");
  }

  private initBoundaryLayer(layers: L.Control.Layers) {
    const boundaryLayer = L.geoJSON(this.boundary, {
      style: (feature) => ({
        weight: 3,
        opacity: 0.5,
        color: '#0000ff',
        fillOpacity: 0.2,
        fillColor: '#6DB65B',
      }),
      onEachFeature: (feature, layer) => layer.bindPopup(this.popupService.makeDetailsPopup(feature.properties.name))
    });
    this.map.addLayer(boundaryLayer);
    layers.addOverlay(boundaryLayer, "HUC-12");
  }

  ngAfterViewInit(): void {
    var control_layers = this.initMap();
    this.initCalMapperLayer(control_layers);
    this.boundaryService.getBoundaryShapes().subscribe((boundary) => {
      this.boundary = boundary;
      this.initBoundaryLayer(control_layers);
    });
  }
}
