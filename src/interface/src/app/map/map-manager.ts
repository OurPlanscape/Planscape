import {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Polygon,
} from 'geojson';
import * as L from 'leaflet';
import 'leaflet-draw';
import 'leaflet.sync';
import { BehaviorSubject, Observable, take } from 'rxjs';

import { BackendConstants } from '../backend-constants';
import { PopupService } from '../services';
import { BaseLayerType, Map } from '../types';

/**
 * Helper class to manage initialization and modification of Leaflet maps.
 * All logic that touches Leaflet layers or objects should live here instead
 * of in map.component.ts.
 */
export class MapManager {
  maps: Map[];
  popupService: PopupService;

  boundaryGeoJsonCache = new Map<string, GeoJSON.GeoJSON>();

  drawingLayer = new L.FeatureGroup();

  startLoadingLayerCallback: (layerName: string) => void;
  doneLoadingLayerCallback: (layerName: string) => void;

  constructor(
    maps: Map[],
    popupService: PopupService,
    startLoadingLayerCallback: (layerName: string) => void,
    doneLoadingLayerCallback: (layerName: string) => void
  ) {
    this.maps = maps;
    this.popupService = popupService;
    this.startLoadingLayerCallback = startLoadingLayerCallback;
    this.doneLoadingLayerCallback = doneLoadingLayerCallback;
  }

  /** Initializes the map with controls and the layer options specified in its config. */
  initLeafletMap(
    map: Map,
    mapId: string,
    existingProjectsGeoJson$: BehaviorSubject<GeoJSON.GeoJSON | null>,
    createDetailCardCallback: (feature: Feature<Geometry, any>) => any,
    getBoundaryLayerGeoJsonCallback: (
      boundaryName: string
    ) => Observable<GeoJSON.GeoJSON>
  ) {
    if (map.instance != undefined) map.instance.remove();

    if (map.config.baseLayerType === BaseLayerType.Road) {
      map.baseLayerRef = this.stadiaAlidadeTiles();
    } else {
      map.baseLayerRef = this.hillshadeTiles();
    }

    map.instance = L.map(mapId, {
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
    this.toggleBoundaryLayer(map, getBoundaryLayerGeoJsonCallback);
    existingProjectsGeoJson$.subscribe((projects: GeoJSON.GeoJSON | null) => {
      if (projects) {
        this.initCalMapperLayer(map, projects, createDetailCardCallback);
      }
    });
  }

  /** Creates a basemap layer using the Hillshade tiles. */
  private hillshadeTiles() {
    return L.tileLayer(
      'https://api.mapbox.com/styles/v1/tsuga11/ckcng1sjp2kat1io3rv2croyl/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoidHN1Z2ExMSIsImEiOiJjanFmaTA5cGIyaXFoM3hqd3R5dzd3bzU3In0.TFqMjIIYtpcyhzNh4iMcQA',
      {
        zIndex: 0,
        tileSize: 512,
        zoomOffset: -1,
      }
    );
  }

  /** Creates a basemap layer using the Stadia.AlidadeSmooth tiles. */
  private stadiaAlidadeTiles() {
    return L.tileLayer(
      'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noreferrer">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      }
    );
  }

  /** Renders the existing project boundaries + metadata in a popup in an optional layer. */
  private initCalMapperLayer(
    map: Map,
    existingProjects: GeoJSON.GeoJSON,
    createDetailCardCallback: (feature: Feature<Geometry, any>) => any
  ) {
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
        layer.bindPopup(createDetailCardCallback(feature));
      },
    });

    if (map.config.showExistingProjectsLayer) {
      map.instance?.addLayer(map.existingProjectsLayerRef);
    }
  }

  /**
   * Darkens everything outside of the region boundary.
   * Type 'any' is used in order to access coordinates.
   */
  maskOutsideRegion(map: L.Map, boundary: any) {
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

  /** Adds drawing controls and handles drawing events. */
  addDrawingControls(
    map: L.Map,
    onDrawCreatedCallback: () => void,
    onDrawDeletedCallback: () => void
  ) {
    map.addLayer(this.drawingLayer);

    const drawOptions: L.Control.DrawConstructorOptions = {
      position: 'bottomright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          metric: false, // Set measurement units to acres
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
        featureGroup: this.drawingLayer, // Required and declares which layer is editable
      },
    };

    const drawControl = new L.Control.Draw(drawOptions);
    map.addControl(drawControl);

    this.setUpDrawingHandlers(
      map,
      onDrawCreatedCallback,
      onDrawDeletedCallback
    );
  }

  private setUpDrawingHandlers(
    map: L.Map,
    onDrawCreatedCallback: () => void,
    onDrawDeletedCallback: () => void
  ) {
    // Show the create button when a polygon is completed
    map.on('draw:created', (event) => {
      const layer = (event as L.DrawEvents.Created).layer;
      this.drawingLayer.addLayer(layer);

      onDrawCreatedCallback();
    });

    // When there are no more polygons, hide the create button
    map.on('draw:deleted', (_) => {
      if (this.drawingLayer.getLayers().length <= 0) {
        onDrawDeletedCallback();
      }
    });
  }

  /**
   * Converts drawingLayer to GeoJSON. If there are multiple polygons drawn,
   * creates and returns MultiPolygon type GeoJSON. Otherwise, returns a Polygon
   * type GeoJSON.
   */
  convertToPlanningArea(): GeoJSON.GeoJSON {
    const drawnGeoJson = this.drawingLayer.toGeoJSON() as FeatureCollection;
    // Case: Single polygon
    if (drawnGeoJson.features.length <= 1) return drawnGeoJson;

    // Case: Multipolygon
    const newFeature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [],
      },
      properties: {},
    };
    drawnGeoJson.features.forEach((feature) => {
      (newFeature.geometry as MultiPolygon).coordinates.push(
        (feature.geometry as Polygon).coordinates
      );
    });

    return {
      type: 'FeatureCollection',
      features: [newFeature],
    } as FeatureCollection;
  }

  /**
   * Enables the polygon drawing tool on a map.
   */
  enablePolygonDrawingTool(map: L.Map) {
    const polygonDrawer = new L.Draw.Polygon(map as L.DrawMap, {
      allowIntersection: false,
      showArea: true,
      metric: false,
      shapeOptions: {
        color: '#7b61ff',
      },
      drawError: {
        color: '#ff7b61',
        message: "Can't draw polygons with intersections!",
      },
    });
    polygonDrawer.enable();
  }

  /** Sync pan, zoom, etc. between all maps. */
  syncAllMaps() {
    this.maps.forEach((mapA) => {
      this.maps.forEach((mapB) => {
        if (mapA !== mapB) {
          (mapA.instance as any).sync(mapB.instance);
        }
      });
    });
  }

  /** Toggles which base layer is shown. */
  changeBaseLayer(map: Map) {
    let baseLayerType = map.config.baseLayerType;
    map.baseLayerRef?.remove();
    if (baseLayerType === BaseLayerType.Terrain) {
      map.baseLayerRef = this.hillshadeTiles();
    } else if (baseLayerType === BaseLayerType.Road) {
      map.baseLayerRef = this.stadiaAlidadeTiles();
    }
    map.instance?.addLayer(map.baseLayerRef!);
  }

  /** Toggles which boundary layer is shown. */
  toggleBoundaryLayer(
    map: Map,
    getBoundaryLayerGeoJsonCallback: (
      boundaryName: string
    ) => Observable<GeoJSON.GeoJSON>
  ) {
    if (map.instance === undefined) return;

    map.boundaryLayerRef?.remove();

    const boundaryLayerName = map.config.boundaryLayerName;

    if (boundaryLayerName !== null) {
      if (this.boundaryGeoJsonCache.has(boundaryLayerName)) {
        map.boundaryLayerRef = this.boundaryLayer(
          this.boundaryGeoJsonCache.get(boundaryLayerName)!
        );
        map.boundaryLayerRef.addTo(map.instance);
      } else {
        this.startLoadingLayerCallback(boundaryLayerName);
        getBoundaryLayerGeoJsonCallback(boundaryLayerName)
          .pipe(take(1))
          .subscribe((geojson) => {
            this.doneLoadingLayerCallback(boundaryLayerName);
            this.boundaryGeoJsonCache.set(boundaryLayerName, geojson);
            map.boundaryLayerRef = this.boundaryLayer(geojson);
            map.boundaryLayerRef.addTo(map.instance!);
          });
      }
    }
  }

  private boundaryLayer(boundary: GeoJSON.GeoJSON): L.Layer {
    return L.geoJSON(boundary, {
      style: (_) => ({
        weight: 3,
        opacity: 0.5,
        color: '#0000ff',
        fillOpacity: 0.2,
        fillColor: '#6DB65B',
      }),
      onEachFeature: (feature, layer) =>
        layer.bindTooltip(
          this.popupService.makeDetailsPopup(feature.properties.shape_name)
        ),
    });
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

  /** Changes which condition scores layer (if any) is shown. */
  changeConditionsLayer(map: Map) {
    if (map.instance === undefined) return;

    map.dataLayerRef?.remove();

    let filepath = map.config.dataLayerConfig.filepath;
    if (filepath?.length === 0 || !filepath) return;
    if (map.config.normalizeDataLayer) {
      filepath = filepath.concat('_normalized');
    }
    filepath = filepath.substring(filepath.lastIndexOf('/') + 1) + '.tif';

    let colormap = map.config.dataLayerConfig.colormap;
    if (colormap?.length === 0 || !colormap) {
      colormap = 'viridis';
    }

    map.dataLayerRef = L.tileLayer.wms(
      BackendConstants.END_POINT + '/conditions/wms',
      {
        crs: L.CRS.EPSG4326,
        minZoom: 7,
        maxZoom: 15,
        format: 'image/png',
        opacity: 0.7,
        layers: filepath,
        styles: colormap,
      }
    );

    if (map.config.showDataLayer) {
      map.dataLayerRef.addTo(map.instance);
    }
  }
}
