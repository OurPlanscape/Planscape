import { AfterViewInit, Component } from '@angular/core';
import * as L from 'leaflet';

import { MapService } from '../map.service';
import { PopupService } from '../popup.service';

export enum BaseLayerType {
  Road,
  Terrain,
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements AfterViewInit {
  public map!: L.Map;

  baseLayerType: BaseLayerType = BaseLayerType.Road;
  baseLayerTypes: number[] = [BaseLayerType.Road, BaseLayerType.Terrain];
  BaseLayerType: typeof BaseLayerType = BaseLayerType;
  showExistingProjectsLayer: boolean = true;
  showHUC12BoundariesLayer: boolean = true;
  existingProjectsLayer!: L.GeoJSON;
  HUC12BoundariesLayer!: L.GeoJSON;

  static hillshade_tiles = L.tileLayer('https://api.mapbox.com/styles/v1/tsuga11/ckcng1sjp2kat1io3rv2croyl/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoidHN1Z2ExMSIsImEiOiJjanFmaTA5cGIyaXFoM3hqd3R5dzd3bzU3In0.TFqMjIIYtpcyhzNh4iMcQA', {
      zIndex: 0,
      tileSize: 512,
      zoomOffset: -1
    });

  static open_street_maps_tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
  });

  constructor(private boundaryService: MapService, private popupService: PopupService) {}

  ngAfterViewInit(): void {
    this.initMap();
    this.boundaryService.getBoundaryShapes().subscribe((boundary: GeoJSON.GeoJSON) => {
      console.log('boundary', boundary);
      this.initBoundaryLayer(boundary);
    });
    this.boundaryService.getExistingProjects().subscribe((existingProjects: GeoJSON.GeoJSON) => {
      console.log('existing projects', existingProjects);
      this.initCalMapperLayer(existingProjects);
    })
  }

  private initMap(): void {
    if (this.map != undefined) this.map.remove();
    this.map = L.map('map', {
      center: [38.646, -120.548],
      zoom: 9,
      layers: [MapComponent.hillshade_tiles, MapComponent.open_street_maps_tiles],
      zoomControl: false,
    });

    // Add zoom controls to bottom right corner
    const zoomControl = L.control.zoom({
      position: 'bottomright'
    });
    zoomControl.addTo(this.map);
  }

  // Renders the existing project boundaries + metadata in a popup in an optional layer.
  private initCalMapperLayer(existingProjects: GeoJSON.GeoJSON) {
    // [elsieling] This step makes the map less responsive
    this.existingProjectsLayer = L.geoJSON(existingProjects, {
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
    );

    this.map.addLayer(this.existingProjectsLayer);
  }

  private initBoundaryLayer(boundary: GeoJSON.GeoJSON) {
    this.HUC12BoundariesLayer = L.geoJSON(boundary, {
      style: (feature) => ({
        weight: 3,
        opacity: 0.5,
        color: '#0000ff',
        fillOpacity: 0.2,
        fillColor: '#6DB65B',
      }),
      onEachFeature: (feature, layer) => layer.bindPopup(this.popupService.makeDetailsPopup(feature.properties.shape_name))
    });
    this.map.addLayer(this.HUC12BoundariesLayer);
  }

  // Toggle which base layer is shown.
  changeBaseLayer() {
    if (this.baseLayerType == BaseLayerType.Terrain) {
      this.map.removeLayer(MapComponent.open_street_maps_tiles);
      this.map.addLayer(MapComponent.hillshade_tiles);
    } else if (this.baseLayerType == BaseLayerType.Road) {
      this.map.removeLayer(MapComponent.hillshade_tiles);
      this.map.addLayer(MapComponent.open_street_maps_tiles);
    }
  }

  // Toggle whether HUC-12 boundaries are shown.
  toggleHUC12BoundariesLayer() {
    if (this.showHUC12BoundariesLayer) {
      this.map.addLayer(this.HUC12BoundariesLayer);
    } else {
      this.map.removeLayer(this.HUC12BoundariesLayer);
    }
  }

  // Toggle whether existing projects from CalMapper are shown.
  toggleExistingProjectsLayer() {
    if (this.showExistingProjectsLayer) {
      this.map.addLayer(this.existingProjectsLayer);
    } else {
      this.map.removeLayer(this.existingProjectsLayer);
    }
  }
}
