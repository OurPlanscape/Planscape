import { AfterViewInit, ApplicationRef, Component, createComponent, EnvironmentInjector, OnDestroy } from '@angular/core';
import { Feature, Geometry } from 'geojson';
import * as L from 'leaflet';
import 'leaflet-draw';
import 'leaflet.sync';
import { BehaviorSubject, map, Observable, Subject, take, takeUntil } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { MapService } from '../map.service';
import { PlanService, PlanState } from '../plan.service';
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
  selectedMapIndex: number = 0;

  selectedRegion$: Observable<Region | null>;
  planState$: Observable<PlanState>;

  baseLayerTypes: number[] = [BaseLayerType.Road, BaseLayerType.Terrain];
  BaseLayerType: typeof BaseLayerType = BaseLayerType;

  huc12BoundaryGeoJson$ = new BehaviorSubject<GeoJSON.GeoJSON | null>(null);
  huc10BoundaryGeoJson$ = new BehaviorSubject<GeoJSON.GeoJSON | null>(null);
  countyBoundaryGeoJson$ = new BehaviorSubject<GeoJSON.GeoJSON | null>(null);
  usForestBoundaryGeoJson$ = new BehaviorSubject<GeoJSON.GeoJSON | null>(null);
  existingProjectsGeoJson$ = new BehaviorSubject<GeoJSON.GeoJSON | null>(null);

  huc12BoundaryGeoJsonLoaded: boolean = false;
  huc10BoundaryGeoJsonLoaded: boolean = false;
  countyBoundaryGeoJsonLoaded: boolean = false;
  usForestBoundaryGeoJsonLoaded: boolean = false;
  existingProjectsGeoJsonLoaded: boolean = false;

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

  static hillshadeTiles() {
    return L.tileLayer(
      'https://api.mapbox.com/styles/v1/tsuga11/ckcng1sjp2kat1io3rv2croyl/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoidHN1Z2ExMSIsImEiOiJjanFmaTA5cGIyaXFoM3hqd3R5dzd3bzU3In0.TFqMjIIYtpcyhzNh4iMcQA',
      {
        zIndex: 0,
        tileSize: 512,
        zoomOffset: -1,
      }
    );
  }

  static stadiaAlidadeTiles() {
    return L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noreferrer">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    });
  }

  static dataLayerTiles() {
    return L.tileLayer.wms('http://localhost:8000/conditions/wms', {
      crs: L.CRS.EPSG4326,
      minZoom: 7,
      maxZoom: 15,
      format: 'image/png',
      opacity: 0.7,
      layers: 'AvailableBiomass_2021_300m_base.tif',
    });
  }

  private readonly destroy$ = new Subject<void>();

  constructor(
    public applicationRef: ApplicationRef,
    private mapService: MapService,
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

    this.selectedRegion$
      .pipe(
        take(1),
        switchMap((selectedRegion) => {
          return this.mapService
            .getHuc12BoundaryShapes(selectedRegion)
            .pipe(takeUntil(this.destroy$));
        })
      )
      .subscribe((boundary: GeoJSON.GeoJSON) => {
        this.huc12BoundaryGeoJson$.next(boundary);
        this.huc12BoundaryGeoJsonLoaded = true;
      });
    this.selectedRegion$
      .pipe(
        take(1),
        switchMap((selectedRegion) => {
          return this.mapService
            .getHuc10BoundaryShapes(selectedRegion)
            .pipe(takeUntil(this.destroy$));
        })
      )
      .subscribe((boundary: GeoJSON.GeoJSON) => {
        this.huc10BoundaryGeoJson$.next(boundary);
        this.huc10BoundaryGeoJsonLoaded = true;
      });
    this.selectedRegion$
      .pipe(
        take(1),
        switchMap((selectedRegion) => {
          return this.mapService
            .getCountyBoundaryShapes(selectedRegion)
            .pipe(takeUntil(this.destroy$));
        })
      )
      .subscribe((boundary: GeoJSON.GeoJSON) => {
        this.countyBoundaryGeoJson$.next(boundary);
        this.countyBoundaryGeoJsonLoaded = true;
      });
    this.selectedRegion$
      .pipe(
        take(1),
        switchMap((selectedRegion) => {
          return this.mapService
            .getUsForestBoundaryShapes(selectedRegion)
            .pipe(takeUntil(this.destroy$));
        })
      )
      .subscribe((boundary: GeoJSON.GeoJSON) => {
        this.usForestBoundaryGeoJson$.next(boundary);
        this.usForestBoundaryGeoJsonLoaded = true;
      });
    this.mapService
      .getExistingProjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe((projects: GeoJSON.GeoJSON) => {
        this.existingProjectsGeoJson$.next(projects);
        this.existingProjectsGeoJsonLoaded = true;
      });

    this.maps = ['map1', 'map2', 'map3', 'map4'].map(
      (id: string, index: number) => {
        return {
          id: id,
          name: 'Map ' + (index + 1),
          config: this.defaultMapConfig(),
        };
      }
    );
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

    if (map.config.baseLayerType === BaseLayerType.Road) {
      map.baseLayerRef = MapComponent.stadiaAlidadeTiles();
    } else {
      map.baseLayerRef = MapComponent.hillshadeTiles();
    }

    map.instance = L.map(id, {
      center: [38.646, -120.548],
      zoom: 9,
      layers: [map.baseLayerRef],
      zoomControl: false,
    });

    // Add zoom controls to bottom right corner
    const zoomControl = L.control.zoom({
      position: 'bottomright',
    });
    zoomControl.addTo(map.instance);

    // Init layers, but only add them to the map instance if specified in the map config.
    this.huc12BoundaryGeoJson$.subscribe((boundary: GeoJSON.GeoJSON | null) => {
      if (boundary) {
        this.initHuc12BoundaryLayer(map, boundary);
      }
    });
    this.huc10BoundaryGeoJson$.subscribe((boundary: GeoJSON.GeoJSON | null) => {
      if (boundary != null) {
        this.initHUC10BoundaryLayer(map, boundary);
      }
    });
    this.countyBoundaryGeoJson$.subscribe(
      (boundary: GeoJSON.GeoJSON | null) => {
        if (boundary) {
          this.initCountyBoundaryLayer(map, boundary);
        }
      }
    );
    this.usForestBoundaryGeoJson$.subscribe(
      (boundary: GeoJSON.GeoJSON | null) => {
        if (boundary != null) {
          this.initUSForestBoundaryLayer(map, boundary);
        }
      }
    );
    this.existingProjectsGeoJson$.subscribe(
      (projects: GeoJSON.GeoJSON | null) => {
        if (projects) {
          this.initCalMapperLayer(map, projects);
        }
      }
    );
    this.initDataLayer(map);

    // Renders the selected region on the map.
    this.selectedRegion$.subscribe((selectedRegion: Region | null) => {
      this.displayRegionBoundary(map.instance!, selectedRegion);
    });

    // Mark the map as selected when the user clicks anywhere on it.
    map.instance.addEventListener('click', () => {
      this.selectedMapIndex = this.maps.indexOf(map);
    });

    return map.instance;
  }

  /** Default starting config for a map. */
  private defaultMapConfig(): MapConfig {
    return {
      baseLayerType: BaseLayerType.Road,
      showExistingProjectsLayer: true,
      showHuc12BoundaryLayer: false,
      showHuc10BoundaryLayer: false,
      showCountyBoundaryLayer: false,
      showUsForestBoundaryLayer: false,
      showDataLayer: false,
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
    this.mapService
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
  private initCalMapperLayer(map: Map, existingProjects: GeoJSON.GeoJSON) {
    // [elsieling] This step makes the map less responsive
    map.existingProjectsLayerRef = L.geoJSON(existingProjects, {
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

    if (map.config.showExistingProjectsLayer) {
      map.instance?.addLayer(map.existingProjectsLayerRef);
    }
  }

  /** Renders the HUC-12 boundaries in an optional layer. */
  private initHuc12BoundaryLayer(map: Map, boundary: GeoJSON.GeoJSON) {
    map.huc12BoundaryLayerRef = L.geoJSON(boundary, {
      style: (_) => ({
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

    if (map.config.showHuc12BoundaryLayer) {
      map.instance?.addLayer(map.huc12BoundaryLayerRef);
    }
  }

  private initHUC10BoundaryLayer(map: Map, boundary: GeoJSON.GeoJSON) {
    map.huc10BoundaryLayerRef = L.geoJSON(boundary, {
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

    if (map.config.showHuc10BoundaryLayer) {
      map.instance?.addLayer(map.huc10BoundaryLayerRef);
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
      onEachFeature: (feature, layer) =>
        layer.bindPopup(
          this.popupService.makeDetailsPopup(feature.properties.shape_name)
        ),
    });

    if (map.config.showCountyBoundaryLayer) {
      map.instance?.addLayer(map.countyBoundaryLayerRef);
    }
  }

  private initUSForestBoundaryLayer(map: Map, boundary: GeoJSON.GeoJSON) {
    map.usForestBoundaryLayerRef = L.geoJSON(boundary, {
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

    if (map.config.showUsForestBoundaryLayer) {
      map.instance?.addLayer(map.usForestBoundaryLayerRef);
    }
  }

  private initDataLayer(map: Map) {
    map.dataLayerRef = MapComponent.dataLayerTiles();

    if (map.config.showDataLayer) {
      map.instance?.addLayer(map.dataLayerRef);
    }
  }

  /** Toggles which base layer is shown. */
  changeBaseLayer(map: Map) {
    let baseLayerType = map.config.baseLayerType;
    map.baseLayerRef?.remove();
    if (baseLayerType === BaseLayerType.Terrain) {
      map.baseLayerRef = MapComponent.hillshadeTiles();
    } else if (baseLayerType === BaseLayerType.Road) {
      map.baseLayerRef = MapComponent.stadiaAlidadeTiles();
    }
    map.instance?.addLayer(map.baseLayerRef!);
  }

  /** Toggles whether HUC-12 boundaries are shown. */
  toggleHuc12BoundariesLayer(map: Map) {
    if (map.instance === undefined) return;

    if (map.config.showHuc12BoundaryLayer) {
      map.huc12BoundaryLayerRef?.addTo(map.instance);
    } else {
      map.huc12BoundaryLayerRef?.remove();
    }
  }

  /** Toggles whether HUC-10 boundaries are shown. */
  toggleHUC10BoundariesLayer(map: Map) {
    if (map.instance === undefined) return;

    if (map.config.showHuc10BoundaryLayer) {
      map.huc10BoundaryLayerRef?.addTo(map.instance);
    } else {
      map.huc10BoundaryLayerRef?.remove();
    }
  }

  /** Toggles whether county boundaries are shown. */
  toggleCountyBoundariesLayer(map: Map) {
    if (map.instance === undefined) return;

    if (map.config.showCountyBoundaryLayer) {
      map.countyBoundaryLayerRef?.addTo(map.instance);
    } else {
      map.countyBoundaryLayerRef?.remove();
    }
  }

  /** Toggles whether US Forest boundaries are shown. */
  toggleUSForestsBoundariesLayer(map: Map) {
    if (map.instance == undefined) return;

    if (map.config.showUsForestBoundaryLayer) {
      map.usForestBoundaryLayerRef?.addTo(map.instance);
    } else {
      map.usForestBoundaryLayerRef?.remove();
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
