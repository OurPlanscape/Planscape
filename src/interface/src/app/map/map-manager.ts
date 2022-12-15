import { MatSnackBar } from '@angular/material/snack-bar';
import {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Polygon,
} from 'geojson';
import * as L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import booleanIntersects from '@turf/boolean-intersects';
import booleanWithin from '@turf/boolean-within';
import { point } from '@turf/helpers';
import 'leaflet.sync';
import { BehaviorSubject, Observable, take } from 'rxjs';

import { BackendConstants } from '../backend-constants';
import { PopupService } from '../services';
import { BaseLayerType, DEFAULT_COLORMAP, Map, MapViewOptions } from '../types';

// Set to true so that layers are not editable by default
L.PM.setOptIn(true);

/**
 * Helper class to manage initialization and modification of Leaflet maps.
 * All logic that touches Leaflet layers or objects should live here instead
 * of in map.component.ts.
 */
export class MapManager {
  boundaryGeoJsonCache = new Map<string, GeoJSON.GeoJSON>();
  polygonsCreated$ = new BehaviorSubject<boolean>(false);
  drawingLayer = new L.FeatureGroup();

  constructor(
    private matSnackBar: MatSnackBar,
    private maps: Map[],
    private readonly mapViewOptions$: BehaviorSubject<MapViewOptions>,
    private popupService: PopupService,
    private startLoadingLayerCallback: (layerName: string) => void,
    private doneLoadingLayerCallback: (layerName: string) => void
  ) {}

  getGeomanDrawOptions(): L.PM.ToolbarOptions {
    return {
      cutPolygon: false,
      drawCircle: false,
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawText: false,
      rotateMode: false,
      position: 'bottomright',
    };
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
      pmIgnore: false,
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
    this.changeConditionsLayer(map);

    // Each map has its own cloned drawing layer because the same layer object cannot
    // be added to multiple maps at the same time. Note this.drawingLayer is only added
    // to one map at a time.
    map.clonedDrawingRef = new L.FeatureGroup();
    map.drawnPolygonLookup = {};
    map.instance!.pm.setGlobalOptions({
      allowSelfIntersection: false,
      snappable: false,
      removeLayerBelowMinVertexCount: false,
      hintlineStyle: {
        color: '#7b61ff',
      },
      templineStyle: {
        color: '#7b61ff',
      },
      layerGroup: this.drawingLayer,
    });
    map.instance!.pm.setPathOptions({
      color: '#7b61ff',
      fillColor: '#7b61ff',
      fillOpacity: 0.2,
    });

    this.setUpEventHandlers(map);
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

  private setUpEventHandlers(map: Map) {
    this.setUpDrawingHandlers(map.instance!);

    // Since maps are synced, pan and zoom event handlers only need
    // to be added to the first instance.
    if (this.maps.indexOf(map) === 0) {
      this.setUpPanHandler(map.instance!);
      this.setUpZoomHandler(map.instance!);
    }
  }

  /**
   * Adds a GeoJSON to the drawing layer.
   * @param area: The geojson of the area to add to the drawing layer.
   */
  addGeoJsonToDrawing(area: GeoJSON.GeoJSON) {
    L.geoJSON(area, {
      style: (_) => ({
        color: '#7b61ff',
        fillColor: '#7b61ff',
        fillOpacity: 0.2,
      }),
      pmIgnore: false,
      onEachFeature: (_, layer) => {
        layer.addTo(this.drawingLayer);
        this.addClonedPolygons(layer);
        layer.on('pm:edit', ({ layer }) => this.editHandler(layer));
      },
    });
    this.polygonsCreated$.next(true);
  }

  /**
   * Given the original polygon, adds the cloned polygons to the cloned drawing
   * layer on all maps.
   */
  private addClonedPolygons(layer: L.Layer) {
    this.maps.forEach((currMap) => {
      const originalId = L.Util.stamp(layer);

      // Hacky way to clone, but it removes the reference to the origin layer
      const clonedLayer = L.geoJson((layer as L.Polygon).toGeoJSON()).setStyle({
        color: '#ffde9e',
        fillColor: '#ffde9e',
      });
      currMap.clonedDrawingRef?.addLayer(clonedLayer);
      currMap.drawnPolygonLookup![originalId] = clonedLayer;
    });
  }

  /**
   * Given the original polygon, removes the cloned polygons from the cloned drawing
   * layer on all maps. Optionally deletes the original polygon key.
   */
  private removeClonedPolygons(layer: L.Layer, deleteOriginal: boolean) {
    this.maps.forEach((currMap) => {
      const originalPolygonKey = L.Util.stamp(layer);
      const clonedPolygon = currMap.drawnPolygonLookup![originalPolygonKey];
      currMap.clonedDrawingRef!.removeLayer(clonedPolygon);
      if (deleteOriginal) {
        delete currMap.drawnPolygonLookup![originalPolygonKey];
      }
    });
  }

  private setUpDrawingHandlers(map: L.Map) {
    /** Handles a created polygon event, which occurs when a polygon is completed. */
    map.on('pm:create', (event) => {
      // Allow drawn layers to be editable
      (event.layer as any).options.pmIgnore = false;
      L.PM.reInitLayer(event.layer);

      const layer = event.layer;
      // Sync created polygons to all maps
      this.addClonedPolygons(layer);

      this.polygonsCreated$.next(true);

      event.layer.on('pm:edit', ({ layer }) => this.editHandler(layer));
    });

    /** Handles the process of drawing the polygon. */
    map.on('pm:drawstart', (event) => {
      event.workingLayer.on('pm:vertexadded', ({ workingLayer, latlng }) => {
        // Check if the vertex overlaps with an existing polygon
        let overlaps = false;
        const existingFeatures =
          this.drawingLayer.toGeoJSON() as FeatureCollection;
        const lastPoint = point([latlng.lng, latlng.lat]);
        existingFeatures.features.forEach((feature) => {
          const isWithin = booleanWithin(lastPoint, feature);
          const isIntersecting = booleanIntersects(
            (workingLayer as L.Polygon).toGeoJSON(),
            feature
          );
          overlaps = isWithin || isIntersecting;
        });
        if (overlaps) {
          this.showDrawingError();
          (map.pm.Draw as any).Polygon._removeLastVertex();
          return;
        }
      });
    });

    /** Handles a polygon removal event. */
    map.on('pm:remove', (event) => {
      const layer = event.layer;
      // Sync deleted polygons to all maps
      this.removeClonedPolygons(layer, true);

      // When there are no more polygons
      if (this.drawingLayer.getLayers().length === 0) {
        this.polygonsCreated$.next(false);
      }
    });
  }

  /** Handles a polygon edit event. */
  private editHandler(layer: L.Layer) {
    const editedLayer = layer as L.Polygon;

    // Check if polygon overlaps another
    let overlaps = false;
    this.drawingLayer.getLayers().forEach((feature) => {
      const existingPolygon = feature as L.Polygon;
      // Skip feature with same latlng because that is what's being edited
      if (existingPolygon.getLatLngs() != editedLayer.getLatLngs()) {
        const isOverlapping = booleanWithin(
          editedLayer.toGeoJSON(),
          existingPolygon.toGeoJSON()
        );
        const isIntersecting = booleanIntersects(
          editedLayer.toGeoJSON(),
          existingPolygon.toGeoJSON()
        );
        overlaps = isOverlapping || isIntersecting;
      }
    });
    if (overlaps) {
      this.showDrawingError();
    }

    // Sync edited polygons to all maps
    this.removeClonedPolygons(layer, false);
    this.addClonedPolygons(layer);
  }

  private showDrawingError() {
    this.matSnackBar.open('[Error] Planning areas cannot overlap!', 'Dismiss', {
      duration: 10000,
      panelClass: ['snackbar-error'],
      verticalPosition: 'top',
    });
  }

  private setUpPanHandler(map: L.Map) {
    if (!this.mapViewOptions$.getValue().center) return;

    map.panTo(this.mapViewOptions$.getValue().center);

    map.addEventListener('moveend', (e) => {
      const mapViewOptions = this.mapViewOptions$.getValue();
      mapViewOptions.center = map.getCenter();
      this.mapViewOptions$.next(mapViewOptions);
    });
  }

  private setUpZoomHandler(map: L.Map) {
    if (!this.mapViewOptions$.getValue().zoom) return;

    map.setZoom(this.mapViewOptions$.getValue().zoom);

    map.addEventListener('zoomend', (e) => {
      const mapViewOptions = this.mapViewOptions$.getValue();
      mapViewOptions.zoom = map.getZoom();
      this.mapViewOptions$.next(mapViewOptions);
    });
  }

  /** Adds the cloned drawing layer to the map. */
  showClonedDrawing(map: Map) {
    map.clonedDrawingRef?.addTo(map.instance!);
  }

  /** Removes the cloned drawing layer from the map. */
  hideClonedDrawing(map: Map) {
    map.clonedDrawingRef?.removeFrom(map.instance!);
  }

  /** Removes drawing control and layer from the map. */
  removeDrawingControl(map: L.Map) {
    map.removeLayer(this.drawingLayer);
    map.pm.removeControls();
  }

  /** Adds drawing control and drawing layer to the map. */
  addDrawingControl(map: L.Map) {
    map.addLayer(this.drawingLayer);
    map.pm.addControls(this.getGeomanDrawOptions());
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

  /** Enables the polygon drawing tool on a map. */
  enablePolygonDrawingTool(map: L.Map) {
    this.addDrawingControl(map);
    map.pm.enableDraw('Polygon');
  }

  /** Disables the polygon drawing tool on a map. */
  disablePolygonDrawingTool(map: L.Map) {
    map.pm.disableDraw();
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
      style: (_) => ({
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillColor: '#000000',
        fillOpacity: 0.4,
      }),
    }).addTo(map);
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

    const boundaryLayerName = map.config.boundaryLayerConfig.boundary_name;

    if (boundaryLayerName !== '') {
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
    filepath = filepath.substring(filepath.lastIndexOf('/') + 1) + '.tif';

    let colormap = map.config.dataLayerConfig.colormap;
    if (colormap?.length === 0 || !colormap) {
      colormap = DEFAULT_COLORMAP;
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

    map.dataLayerRef.addTo(map.instance);
  }
}
