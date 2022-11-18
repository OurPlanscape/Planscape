import { AfterViewInit, ApplicationRef, Component, createComponent, EnvironmentInjector, OnDestroy } from '@angular/core';
import { Feature, Geometry } from 'geojson';
import * as L from 'leaflet';
import 'leaflet-draw';
import 'leaflet.sync';
import { BehaviorSubject, Observable, Subject, take, takeUntil } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { MapService } from '../map.service';
import { PlanState, PlanService } from '../plan.service';
import { PopupService } from '../popup.service';
import { SessionService } from '../session.service';
import { BaseLayerType, Map, MapConfig, Region } from '../types';
import { Legend } from './../shared/legend/legend.component';
import { ProjectCardComponent } from './project-card/project-card.component';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  maps: Map[];
  mapCount: number = 2;
  mapCountOptions: number[] = [1, 2, 4];
  selectedMapIdx: number = 0;

  selectedRegion$: Observable<Region|null>
  planState$: Observable<PlanState>

  baseLayerTypes: number[] = [BaseLayerType.Road, BaseLayerType.Terrain];
  BaseLayerType: typeof BaseLayerType = BaseLayerType;

  HUC12BoundaryGeoJson$: BehaviorSubject<GeoJSON.GeoJSON | null> = new BehaviorSubject<GeoJSON.GeoJSON | null>(null);
  countyBoundaryGeoJson$: BehaviorSubject<GeoJSON.GeoJSON | null> = new BehaviorSubject<GeoJSON.GeoJSON | null>(null);
  existingProjectsGeoJson$: BehaviorSubject<GeoJSON.GeoJSON | null> = new BehaviorSubject<GeoJSON.GeoJSON | null>(null);

  legend: Legend = {
    labels: ['Highest', 'Higher', 'High', 'Mid-high', 'Mid-low', 'Low', 'Lower', 'Lowest'],
    colors: ['#f65345', '#e9884f', '#e5ab64', '#e6c67a', '#cccfa7', '#a5c5a6', '#74afa5', '#508295'],
  };

  static hillshade_tiles() {
    return L.tileLayer('https://api.mapbox.com/styles/v1/tsuga11/ckcng1sjp2kat1io3rv2croyl/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoidHN1Z2ExMSIsImEiOiJjanFmaTA5cGIyaXFoM3hqd3R5dzd3bzU3In0.TFqMjIIYtpcyhzNh4iMcQA', {
      zIndex: 0,
      tileSize: 512,
      zoomOffset: -1
    });
  }

  static open_street_maps_tiles() {
    return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    });
  }

  static data_layer_tiles() {
    return L.tileLayer.wms('http://localhost:8000/conditions/wms', {
      crs: L.CRS.EPSG4326,
      minZoom: 7,
      maxZoom: 15,
      format: 'image/png',
      opacity: 0.7,
      layers: 'AvailableBiomass_2021_300m_base.tif'
    });
  }

  private readonly destroy$ = new Subject<void>();

  constructor(
    public applicationRef: ApplicationRef,
    private boundaryService: MapService,
    private environmentInjector: EnvironmentInjector,
    private popupService: PopupService,
    private sessionService: SessionService,
    private planService: PlanService,
    ) {
      this.selectedRegion$ = this.sessionService.region$.pipe(takeUntil(this.destroy$));
      this.planState$ = this.planService.planState$.pipe(takeUntil(this.destroy$));

      // this.HUC12BoundaryGeoJson$ = this.selectedRegion$.pipe(
      //   take(1),
      //   switchMap((selectedRegion) => {
      //     return this.boundaryService.getHUC12BoundaryShapes(selectedRegion).pipe(takeUntil(this.destroy$));
      // }));
      this.selectedRegion$.pipe(
        take(1),
        switchMap((selectedRegion) => {
          return this.boundaryService.getHUC12BoundaryShapes(selectedRegion).pipe(takeUntil(this.destroy$))
        })
      ).subscribe((boundary: GeoJSON.GeoJSON) => {
        this.HUC12BoundaryGeoJson$.next(boundary);
      });
      this.selectedRegion$.pipe(
        take(1),
        switchMap((selectedRegion) => {
          return this.boundaryService.getCountyBoundaryShapes(selectedRegion).pipe(takeUntil(this.destroy$));
        })
      ).subscribe((boundary: GeoJSON.GeoJSON) => {
        this.countyBoundaryGeoJson$.next(boundary);
      });
      this.boundaryService.getExistingProjects().pipe(
        takeUntil(this.destroy$)
      ).subscribe((projects: GeoJSON.GeoJSON) => {
        this.existingProjectsGeoJson$.next(projects);
      });

      this.maps = ['map1', 'map2', 'map3', 'map4'].map((id: string, index: number) => {
        return {
          id: id,
          name: 'Map ' + (index + 1),
          config: this.defaultMapConfig()
        };
      });
  }

  ngAfterViewInit(): void {
    this.maps.forEach((map: Map) => {
      this.initMap(map, map.id);
    });

    this.syncAllMaps();

    this.addDrawingControls(this.maps[0].instance!);
  }

  ngOnDestroy(): void {
    this.maps.forEach((map: Map) => map.instance?.remove());
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Initializes the map with controls and the layer options specified in its config. */
  private initMap(map: Map, id: string): L.Map {
    if (map.instance != undefined) map.instance.remove();

    if (map.config.baseLayerType == BaseLayerType.Road) {
      map.baseLayerRef = MapComponent.open_street_maps_tiles();
    } else {
      map.baseLayerRef = MapComponent.hillshade_tiles();
    }

    map.instance = L.map(id, {
      center: [38.646, -120.548],
      zoom: 9,
      layers: [map.baseLayerRef],
      zoomControl: false,
    });

    // Add zoom controls to bottom right corner
    const zoomControl = L.control.zoom({
      position: 'bottomright'
    });
    zoomControl.addTo(map.instance);

    // Init layers, but only add them to the map instance if specified in the map config.
    this.HUC12BoundaryGeoJson$.subscribe((boundary: GeoJSON.GeoJSON | null) => {
      if (boundary != null) {
        this.initHUC12BoundaryLayer(map, boundary);
      }
    });
    this.countyBoundaryGeoJson$.subscribe((boundary: GeoJSON.GeoJSON | null) => {
      if (boundary != null) {
        this.initCountyBoundaryLayer(map, boundary);
      }
    });
    this.existingProjectsGeoJson$.subscribe((projects: GeoJSON.GeoJSON | null) => {
      if (projects != null) {
        this.initCalMapperLayer(map, projects);
      }
    });
    this.initDataLayer(map);

    // Renders the selected region on the map.
    this.selectedRegion$.subscribe((selectedRegion: Region | null) => {
      this.displayRegionBoundary(map.instance!, selectedRegion);
    });

    // Mark the map as selected when the user clicks anywhere on it.
    map.instance.addEventListener('click', () => {
      this.selectedMapIdx = this.maps.indexOf(map);
    });

    return map.instance;
  }

  /** Default starting config for a map. */
  private defaultMapConfig(): MapConfig {
    return {
      baseLayerType: BaseLayerType.Road,
      showExistingProjectsLayer: true,
      showHUC12BoundariesLayer: false,
      showCountyBoundariesLayer: false,
      showDataLayer: false
    };
  }

  /** Sync pan, zoom, etc. between all maps. */
  private syncAllMaps() {
    this.maps.forEach((mapA) => {
      this.maps.forEach((mapB) => {
        if (mapA !== mapB) {
          (mapA.instance as any).sync(mapB.instance);
        }
      });
    })
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
                    message: 'Can\'t draw polygons with intersections!',
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
        }
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

      this.planService.createPlan({
        name: 'tempName',
        ownerId: 'tempUserId',
        region: selectedRegion,
        planningArea: shape,
      }).subscribe(result => {
        console.log(result);
      });
    });
  }

  /** Gets the selected region geojson and renders it on the map. */
  private displayRegionBoundary(map: L.Map, selectedRegion: Region | null) {
    if (!selectedRegion) return;
    this.boundaryService.getRegionBoundary(selectedRegion).subscribe(
      (boundary: GeoJSON.GeoJSON) => {
        this.maskOutsideRegion(map, boundary);
    });
  }

  /**
   * Darkens everything outside of the region boundary.
   * Type 'any' is used in order to access coordinates.
   * */
  private maskOutsideRegion(map: L.Map, boundary: any) {
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
    }).addTo(map);
  }

  /** Renders the existing project boundaries + metadata in a popup in an optional layer. */
  private initCalMapperLayer(map: Map, existingProjects: GeoJSON.GeoJSON) {
    // [elsieling] This step makes the map less responsive
    map.existingProjectsLayerRef = L.geoJSON(existingProjects, {
        style: function(_) {
          return {
            "color": "#000000",
            "weight": 3,
            "opacity": 0.9
          }
        },
        onEachFeature: (feature: Feature<Geometry, any>, layer: L.Layer) => {
          let component = createComponent(ProjectCardComponent, { environmentInjector: this.environmentInjector });
          component.instance.feature = feature;
          this.applicationRef.attachView(component.hostView);
          layer.bindPopup(component.location.nativeElement);
        },
      }
    );

    if (map.config.showExistingProjectsLayer) {
      map.instance?.addLayer(map.existingProjectsLayerRef);
    }
  }


  /** Renders the HUC-12 boundaries in an optional layer. */
  private initHUC12BoundaryLayer(map: Map, boundary: GeoJSON.GeoJSON) {
    map.HUC12BoundaryLayerRef = L.geoJSON(boundary, {
      style: (_) => ({
        weight: 3,
        opacity: 0.5,
        color: '#0000ff',
        fillOpacity: 0.2,
        fillColor: '#6DB65B',
      }),
      onEachFeature: (feature, layer) => layer.bindPopup(this.popupService.makeDetailsPopup(feature.properties.shape_name))
    });

    if (map.config.showHUC12BoundariesLayer) {
      map.instance?.addLayer(map.HUC12BoundaryLayerRef);
    }
  }

  /** Renders the county boundaries in an optional layer. */
  private initCountyBoundaryLayer(map: Map, boundary: GeoJSON.GeoJSON) {
    map.countyBoundaryLayerRef = L.geoJSON(boundary, {
      style: (feature) => ({
        weight: 3,
        opacity: 0.5,
        color: '#0000ff',
        fillOpacity: 0.2,
        fillColor: '#6DB65B',
      }),
      onEachFeature: (feature, layer) => layer.bindPopup(this.popupService.makeDetailsPopup(feature.properties.shape_name))
    });

    if (map.config.showCountyBoundariesLayer) {
      map.instance?.addLayer(map.countyBoundaryLayerRef);
    }
  }

  private initDataLayer(map: Map) {
    map.dataLayerRef = MapComponent.data_layer_tiles();

    if (map.config.showDataLayer) {
      map.instance?.addLayer(map.dataLayerRef);
    }
  }

  /** Toggles which base layer is shown. */
  changeBaseLayer(map: Map) {
    let baseLayerType = map.config.baseLayerType;
    map.baseLayerRef?.remove();
    if (baseLayerType === BaseLayerType.Terrain) {
      map.baseLayerRef = MapComponent.hillshade_tiles();
    } else if (baseLayerType === BaseLayerType.Road) {
      map.baseLayerRef = MapComponent.open_street_maps_tiles();
    }
    map.instance?.addLayer(map.baseLayerRef!);
  }

  /** Toggles whether HUC-12 boundaries are shown. */
  toggleHUC12BoundariesLayer(map: Map) {
    if (map.instance === undefined) return;

    if (map.config.showHUC12BoundariesLayer) {
      map.HUC12BoundaryLayerRef?.addTo(map.instance);
    } else {
      map.HUC12BoundaryLayerRef?.remove();
    }
  }

   /** Toggles whether county boundaries are shown. */
   toggleCountyBoundariesLayer(map: Map) {
    if (map.instance === undefined) return;

    if (map.config.showCountyBoundariesLayer) {
      map.countyBoundaryLayerRef?.addTo(map.instance);
    } else {
      map.countyBoundaryLayerRef?.remove();
    }
  }

  /** Toggles whether existing projects from CalMapper are shown. */
  toggleExistingProjectsLayer(map: Map) {
    if (map.instance === undefined) return;

    if (map.config.showExistingProjectsLayer) {
      map.existingProjectsLayerRef?.addTo(map.instance);
    } else {
      map.existingProjectsLayerRef?.remove();
    }
  }

  /** Toggles whether data layer is shown. */
  toggleDataLayer(map: Map) {
    if (map.instance === undefined) return;

    if (map.config.showDataLayer) {
      map.dataLayerRef?.addTo(map.instance);
    } else {
      map.dataLayerRef?.remove();
    }
  }

  changeMapCount() {
    setTimeout(() => {
      this.maps.forEach((map: Map) => map.instance?.invalidateSize());
    }, 0);
  }
}
