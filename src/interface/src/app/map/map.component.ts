import {
  AfterViewInit,
  ApplicationRef,
  Component,
  createComponent,
  EnvironmentInjector,
  OnDestroy,
} from '@angular/core';
import { Observable, Subject, take, takeUntil } from 'rxjs';
import { Feature, Geometry } from 'geojson';
import { switchMap } from 'rxjs/operators';
import * as L from 'leaflet';
import 'leaflet-draw';
import 'leaflet.sync';

import { MapService } from '../map.service';
import { PlanState, PlanService } from '../plan.service';
import { PopupService } from '../popup.service';
import { SessionService } from '../session.service';
import { BaseLayerType, Region } from '../types';
import { Legend } from './../shared/legend/legend.component';
import { ProjectCardComponent } from './project-card/project-card.component';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  map!: L.Map;
  map2!: L.Map;
  map3!: L.Map;
  map4!: L.Map;
  maps: L.Map[] = [];
  mapCount: number = 2;
  mapCountOptions: number[] = [1, 2, 4];

  selectedRegion$: Observable<Region | null>;
  planState$: Observable<PlanState>;

  baseLayerType: BaseLayerType = BaseLayerType.Road;
  baseLayerTypes: number[] = [BaseLayerType.Road, BaseLayerType.Terrain];
  BaseLayerType: typeof BaseLayerType = BaseLayerType;

  showDataLayer: boolean = false;
  showExistingProjectsLayer: boolean = true;
  showHUC12BoundariesLayer: boolean = false;
  showHUC10BoundariesLayer: boolean = false;
  showCountyBoundariesLayer: boolean = false;
  showUSForestBoundariesLayer: boolean = false;

  existingProjectsLayer!: L.GeoJSON;
  HUC12BoundariesLayer!: L.GeoJSON;
  HUC10BoundariesLayer!: L.GeoJSON;
  CountyBoundariesLayer!: L.GeoJSON;
  USForestBoundariesLayer!: L.GeoJSON;

  legend: Legend = {
    labels: [
      'Highest',
      'Higher',
      'High',
      'Mid-high',
      'Mid-low',
      'Low',
      'Lower',
      'Lowest',
    ],
    colors: [
      '#f65345',
      '#e9884f',
      '#e5ab64',
      '#e6c67a',
      '#cccfa7',
      '#a5c5a6',
      '#74afa5',
      '#508295',
    ],
  };

  static hillshade_tiles() {
    return L.tileLayer(
      'https://api.mapbox.com/styles/v1/tsuga11/ckcng1sjp2kat1io3rv2croyl/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoidHN1Z2ExMSIsImEiOiJjanFmaTA5cGIyaXFoM3hqd3R5dzd3bzU3In0.TFqMjIIYtpcyhzNh4iMcQA',
      {
        zIndex: 0,
        tileSize: 512,
        zoomOffset: -1,
      }
    );
  }

  static open_street_maps_tiles() {
    return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    });
  }

  static data_layer_tiles = L.tileLayer.wms(
    'http://localhost:8000/conditions/wms',
    {
      crs: L.CRS.EPSG4326,
      minZoom: 7,
      maxZoom: 15,
      format: 'image/png',
      opacity: 0.7,
      layers: 'AvailableBiomass_2021_300m_base.tif',
    }
  );

  private readonly destroy$ = new Subject<void>();

  constructor(
    public applicationRef: ApplicationRef,
    private boundaryService: MapService,
    private environmentInjector: EnvironmentInjector,
    private popupService: PopupService,
    private sessionService: SessionService,
    private planService: PlanService
  ) {
    this.selectedRegion$ = this.sessionService.region$.pipe(
      takeUntil(this.destroy$)
    );
    this.planState$ = this.planService.planState$.pipe(
      takeUntil(this.destroy$)
    );
  }

  ngAfterViewInit(): void {
    this.map = this.initMap(this.map, 'map1');
    this.map2 = this.initMap(this.map2, 'map2');
    this.map3 = this.initMap(this.map3, 'map3');
    this.map4 = this.initMap(this.map4, 'map4');
    this.maps = [this.map, this.map2, this.map3, this.map4];

    this.syncAllMaps();

    this.addDrawingControls(this.map);

    this.selectedRegion$.pipe(take(1)).subscribe((selectedRegion) => {
      this.maps.forEach((map: L.Map) => {
        this.displayRegionBoundary(map, selectedRegion);
      });
    });

    this.selectedRegion$
      .pipe(
        take(1),
        switchMap((selectedRegion) => {
          return this.boundaryService
            .getHUC12BoundaryShapes(selectedRegion)
            .pipe(take(1));
        })
      )
      .subscribe((boundary: GeoJSON.GeoJSON) => {
        this.initHUC12BoundaryLayer(this.map, boundary);
      });
    this.selectedRegion$
      .pipe(
        take(1),
        switchMap((selectedRegion) => {
          return this.boundaryService
            .getHUC10BoundaryShapes(selectedRegion)
            .pipe(take(1));
        })
      )
      .subscribe((boundary: GeoJSON.GeoJSON) => {
        this.initHUC10BoundaryLayer(this.map, boundary);
      });
    this.selectedRegion$
      .pipe(
        take(1),
        switchMap((selectedRegion) => {
          return this.boundaryService
            .getCountyBoundaryShapes(selectedRegion)
            .pipe(take(1));
        })
      )
      .subscribe((boundary: GeoJSON.GeoJSON) => {
        this.initCountyBoundaryLayer(this.map, boundary);
      });
    this.selectedRegion$
      .pipe(
        take(1),
        switchMap((selectedRegion) => {
          return this.boundaryService
            .getUSForestBoundaryShapes(selectedRegion)
            .pipe(take(1));
        })
      )
      .subscribe((boundary: GeoJSON.GeoJSON) => {
        this.initUSForestBoundaryLayer(this.map, boundary);
      });
    this.boundaryService
      .getExistingProjects()
      .pipe(take(1))
      .subscribe((existingProjects: GeoJSON.GeoJSON) => {
        this.initCalMapperLayer(this.map, existingProjects);
      });
  }

  ngOnDestroy(): void {
    this.map.remove();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Initializes the map with the base layers and controls. */
  private initMap(map: L.Map, id: string): L.Map {
    if (map != undefined) map.remove();
    map = L.map(id, {
      center: [38.646, -120.548],
      zoom: 9,
      layers: [
        MapComponent.hillshade_tiles(),
        MapComponent.open_street_maps_tiles(),
      ],
      zoomControl: false,
    });

    // Add zoom controls to bottom right corner
    const zoomControl = L.control.zoom({
      position: 'bottomright',
    });
    zoomControl.addTo(map);

    return map;
  }

  private syncAllMaps() {
    this.maps.forEach((mapA) => {
      this.maps.forEach((mapB) => {
        if (mapA !== mapB) {
          (mapA as any).sync(mapB);
        }
      });
    });
  }

  /** Adds drawing controls and handles drawing events. */
  private addDrawingControls(map: L.Map) {
    const drawingLayer = new L.FeatureGroup();
    map.addLayer(drawingLayer);

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
            message: "Can't draw polygons with intersections!",
          },
        }, // Set to false to disable each tool
        polyline: false,
        circle: false,
        rectangle: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawingLayer, // Required and declares which layer is editable
      },
    };

    const drawControl = new L.Control.Draw(drawOptions);
    map.addControl(drawControl);

    map.on('draw:created', (event) => {
      const layer = (event as L.DrawEvents.Created).layer;
      drawingLayer.addLayer(layer);

      this.createPlan(layer.toGeoJSON());
    });
  }

  private createPlan(shape: GeoJSON.GeoJSON) {
    this.selectedRegion$.subscribe((selectedRegion) => {
      if (!selectedRegion) return;

      this.planService
        .createPlan({
          name: 'tempName',
          ownerId: 'tempUserId',
          region: selectedRegion,
          planningArea: shape,
        })
        .subscribe((result) => {
          console.log(result);
        });
    });
  }

  /** Gets the selected region geojson and renders it on the map. */
  private displayRegionBoundary(map: L.Map, selectedRegion: Region | null) {
    if (!selectedRegion) return;
    this.boundaryService
      .getRegionBoundary(selectedRegion)
      .subscribe((boundary: GeoJSON.GeoJSON) => {
        this.maskOutsideRegion(map, boundary);
      });
  }

  /**
   * Darkens everything outside of the region boundary.
   * Type 'any' is used in order to access coordinates.
   * */
  private maskOutsideRegion(map: L.Map, boundary: any) {
    // Add corners of the map to invert the polygon
    boundary.features[0].geometry.coordinates[0].unshift([
      [180, -90],
      [180, 90],
      [-180, 90],
      [-180, -90],
    ]);
    L.geoJSON(boundary, {
      style: (feature) => ({
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillColor: '#000000',
        fillOpacity: 0.4,
      }),
    }).addTo(map);
  }

  /** Renders the existing project boundaries + metadata in a popup in an optional layer. */
  private initCalMapperLayer(map: L.Map, existingProjects: GeoJSON.GeoJSON) {
    // [elsieling] This step makes the map less responsive
    this.existingProjectsLayer = L.geoJSON(existingProjects, {
      style: function (_) {
        return {
          color: '#000000',
          weight: 3,
          opacity: 0.9,
        };
      },
      onEachFeature: (feature: Feature<Geometry, any>, layer: L.Layer) => {
        let component = createComponent(ProjectCardComponent, {
          environmentInjector: this.environmentInjector,
        });
        component.instance.feature = feature;
        this.applicationRef.attachView(component.hostView);
        layer.bindPopup(component.location.nativeElement);
      },
    });

    map.addLayer(this.existingProjectsLayer);
  }

  private initHUC12BoundaryLayer(map: L.Map, boundary: GeoJSON.GeoJSON) {
    this.HUC12BoundariesLayer = L.geoJSON(boundary, {
      style: (feature) => ({
        weight: 3,
        opacity: 0.5,
        color: '#0000ff',
        fillOpacity: 0.2,
        fillColor: '#6DB65B',
      }),
      onEachFeature: (feature, layer) =>
        layer.bindPopup(
          this.popupService.makeDetailsPopup(feature.properties.shape_name)
        ),
    });
  }

  private initHUC10BoundaryLayer(map: L.Map, boundary: GeoJSON.GeoJSON) {
    this.HUC10BoundariesLayer = L.geoJSON(boundary, {
      style: (feature) => ({
        weight: 3,
        opacity: 0.5,
        color: '#0000ff',
        fillOpacity: 0.2,
        fillColor: '#6DB65B',
      }),
      onEachFeature: (feature, layer) =>
        layer.bindPopup(
          this.popupService.makeDetailsPopup(feature.properties.shape_name)
        ),
    });
  }

  private initCountyBoundaryLayer(map: L.Map, boundary: GeoJSON.GeoJSON) {
    this.CountyBoundariesLayer = L.geoJSON(boundary, {
      style: (feature) => ({
        weight: 3,
        opacity: 0.5,
        color: '#0000ff',
        fillOpacity: 0.2,
        fillColor: '#6DB65B',
      }),
      onEachFeature: (feature, layer) =>
        layer.bindPopup(
          this.popupService.makeDetailsPopup(feature.properties.shape_name)
        ),
    });
  }

  private initUSForestBoundaryLayer(map: L.Map, boundary: GeoJSON.GeoJSON) {
    this.USForestBoundariesLayer = L.geoJSON(boundary, {
      style: (feature) => ({
        weight: 3,
        opacity: 0.5,
        color: '#0000ff',
        fillOpacity: 0.2,
        fillColor: '#6DB65B',
      }),
      onEachFeature: (feature, layer) =>
        layer.bindPopup(
          this.popupService.makeDetailsPopup(feature.properties.shape_name)
        ),
    });
  }

  /** Toggles which base layer is shown. */
  changeBaseLayer() {
    if (this.baseLayerType === BaseLayerType.Terrain) {
      this.map.removeLayer(MapComponent.open_street_maps_tiles());
      this.map.addLayer(MapComponent.hillshade_tiles());
    } else if (this.baseLayerType === BaseLayerType.Road) {
      this.map.removeLayer(MapComponent.hillshade_tiles());
      this.map.addLayer(MapComponent.open_street_maps_tiles());
    }
  }

  /** Toggles whether data layer is shown. */
  toggleDataLayer() {
    if (this.showDataLayer) {
      this.map.addLayer(MapComponent.data_layer_tiles);
    } else {
      this.map.removeLayer(MapComponent.data_layer_tiles);
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

  /** Toggles whether HUC-10 boundaries are shown. */
  toggleHUC10BoundariesLayer() {
    if (this.showHUC10BoundariesLayer) {
      this.map.addLayer(this.HUC10BoundariesLayer);
    } else {
      this.map.removeLayer(this.HUC10BoundariesLayer);
    }
  }

  /** Toggles whether county boundaries are shown. */
  toggleCountyBoundariesLayer() {
    if (this.showCountyBoundariesLayer) {
      this.map.addLayer(this.CountyBoundariesLayer);
    } else {
      this.map.removeLayer(this.CountyBoundariesLayer);
    }
  }

  /** Toggles whether US Forest boundaries are shown. */
  toggleUSForestsBoundariesLayer() {
    if (this.showUSForestBoundariesLayer) {
      this.map.addLayer(this.USForestBoundariesLayer);
    } else {
      this.map.removeLayer(this.USForestBoundariesLayer);
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

  changeMapCount() {
    setTimeout(() => {
      this.map.invalidateSize();
      this.map2.invalidateSize();
      this.map3.invalidateSize();
      this.map4.invalidateSize();
    }, 0);
  }
}
