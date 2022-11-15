import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { Observable, Subject, take, takeUntil } from 'rxjs';
import * as L from 'leaflet';
import 'leaflet-draw';

import { MapService } from '../map.service';
import { PopupService } from '../popup.service';
import { SessionService } from '../session.service';
import { Legend } from './../shared/legend/legend.component';
import { BaseLayerType, Region } from '../types';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  map!: L.Map;
  selectedRegion$: Observable<Region|null>
  baseLayerType: BaseLayerType = BaseLayerType.Road;
  baseLayerTypes: number[] = [BaseLayerType.Road, BaseLayerType.Terrain];
  BaseLayerType: typeof BaseLayerType = BaseLayerType;
  showExistingProjectsLayer: boolean = true;
  showHUC12BoundariesLayer: boolean = true;
  existingProjectsLayer!: L.GeoJSON;
  HUC12BoundariesLayer!: L.GeoJSON;

  legend: Legend = {
    labels: ['Highest', 'Higher', 'High', 'Mid-high', 'Mid-low', 'Low', 'Lower', 'Lowest'],
    colors: ['#f65345', '#e9884f', '#e5ab64', '#e6c67a', '#cccfa7', '#a5c5a6', '#74afa5', '#508295'],
  };

  static hillshade_tiles = L.tileLayer('https://api.mapbox.com/styles/v1/tsuga11/ckcng1sjp2kat1io3rv2croyl/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoidHN1Z2ExMSIsImEiOiJjanFmaTA5cGIyaXFoM3hqd3R5dzd3bzU3In0.TFqMjIIYtpcyhzNh4iMcQA', {
      zIndex: 0,
      tileSize: 512,
      zoomOffset: -1
    });

  static open_street_maps_tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
  });

  private readonly destroy$ = new Subject<void>();

  constructor(
    private boundaryService: MapService,
    private popupService: PopupService,
    private sessionService: SessionService) {
      this.selectedRegion$ = this.sessionService.region$.pipe(takeUntil(this.destroy$));
    }

  ngAfterViewInit(): void {
    this.initMap();
    this.selectedRegion$.subscribe((selectedRegion) => {
      this.displayRegionBoundary(selectedRegion);
    });
    this.boundaryService.getBoundaryShapes().pipe(take(1)).subscribe((boundary: GeoJSON.GeoJSON) => {
      this.initBoundaryLayer(boundary);
    });
    this.boundaryService.getExistingProjects().pipe(take(1)).subscribe((existingProjects: GeoJSON.GeoJSON) => {
      console.log('existing projects', existingProjects);
      this.initCalMapperLayer(existingProjects);
    });
  }

  ngOnDestroy(): void {
    this.map.remove();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Initializes the map with the base layers and controls. */
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

    this.addDrawingControls();
  }

  /** Adds drawing controls. */
  private addDrawingControls() {
    const drawingLayer = new L.FeatureGroup();
    this.map.addLayer(drawingLayer);

    const drawOptions: L.Control.DrawConstructorOptions = {
        position: 'topright',
        draw: {
            polygon: {
                allowIntersection: false,
                showArea: true,
                metric: false, // Set measurement units to acres
                repeatMode: true, // Stays in polygon mode after completing a shape
                shapeOptions: {
                  color: '#7b61ff',
                },
                drawError: {
                    color: '#ff7b61',
                    message: 'Can\'t draw intersections!',
                },
            }, // Set to false to disable each tool
            polyline: false,
            circle: false,
            rectangle: false,
            marker: false,
        },
        edit: {
            featureGroup: drawingLayer, // Required and declares which layer is editable
        }
    };

    const drawControl = new L.Control.Draw(drawOptions);
    this.map.addControl(drawControl);

    this.map.on('draw:created', (event) => {
      const layer = (event as L.DrawEvents.Created).layer;
      drawingLayer.addLayer(layer);
    });
  }

  /** Gets the selected region geojson and renders it on the map. */
  private displayRegionBoundary(selectedRegion: Region | null) {
    if (!selectedRegion) return;
    this.boundaryService.getRegionBoundary(selectedRegion).subscribe(
      (boundary: GeoJSON.GeoJSON) => {
        this.maskOutsideRegion(boundary);
    });
  }

  /**
   * Darkens everything outside of the region boundary.
   * Type 'any' is used in order to access coordinates.
   * */
  private maskOutsideRegion(boundary: any) {
    // Add corners of the map to invert the polygon
    boundary.features[0].geometry.coordinates[0].unshift([[180, -90], [180, 90], [-180, 90], [-180, -90]]);
    L.geoJSON(boundary, {
      style: (feature) => ({
        "color": "#ffffff",
        "weight": 2,
        "opacity": 1,
        "fillColor": "#000000",
        "fillOpacity": 0.4,
      })
    }).addTo(this.map);
  }

  /** Renders the existing project boundaries + metadata in a popup in an optional layer. */
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

  /** Toggles which base layer is shown. */
  changeBaseLayer() {
    if (this.baseLayerType === BaseLayerType.Terrain) {
      this.map.removeLayer(MapComponent.open_street_maps_tiles);
      this.map.addLayer(MapComponent.hillshade_tiles);
    } else if (this.baseLayerType === BaseLayerType.Road) {
      this.map.removeLayer(MapComponent.hillshade_tiles);
      this.map.addLayer(MapComponent.open_street_maps_tiles);
    }
  }

  /** Toggles whether HUC-12 boundaries are shown. */
  toggleHUC12BoundariesLayer() {
    if (this.showHUC12BoundariesLayer) {
      this.map.addLayer(this.HUC12BoundariesLayer);
    } else {
      this.map.removeLayer(this.HUC12BoundariesLayer);
    }
  }

  /** Toggles whether existing projects from CalMapper are shown. */
  toggleExistingProjectsLayer() {
    if (this.showExistingProjectsLayer) {
      this.map.addLayer(this.existingProjectsLayer);
    } else {
      this.map.removeLayer(this.existingProjectsLayer);
    }
  }
}
