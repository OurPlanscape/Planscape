import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { HttpClient, HttpParams } from '@angular/common/http';
import booleanIntersects from '@turf/boolean-intersects';
import booleanWithin from '@turf/boolean-within';
import { point } from '@turf/helpers';
import { Feature, FeatureCollection, Geometry } from 'geojson';
import * as L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import 'leaflet.sync';
import { BehaviorSubject, Observable, take } from 'rxjs';
import { PopupService, SessionService } from '@services';
import {
  BaseLayerType,
  DEFAULT_COLORMAP,
  FrontendConstants,
  Map,
  MapViewOptions,
  Region,
} from '@types';

import { SNACK_ERROR_CONFIG } from '@shared';
import {
  BOUNDARY_LAYER_HOVER_STYLES,
  BOUNDARY_LAYER_NORMAL_STYLES,
  DRAWING_STYLES,
  GEOMAN_DRAW_OPTIONS,
  HOVER_STYLES,
  NORMAL_STYLES,
} from './map.constants';
import {
  areaOverlaps,
  checkIfAreaInBoundaries,
  createMultiPolygonFeatureCollection,
  regionMapCenters,
  transformCoordToLayer,
} from './map.helper';
import { satelliteTiles, stadiaAlidadeTiles, terrainTiles } from './map.tiles';
import { createAndAddLegend } from './map.legends';
import { addClonedLayerToMap, removeClonedLayer } from './map.layers';
import * as esri from 'esri-leaflet';
import { environment } from '../../environments/environment';

// Set to true so that layers are not editable by default
L.PM.setOptIn(true);

/**
 * Helper class to manage initialization and modification of Leaflet maps.
 * All logic that touches Leaflet layers or objects should live here instead
 * of in map.component.ts.
 */
export class MapManager {
  polygonsCreated$ = new BehaviorSubject<boolean>(false);
  drawingLayer = new L.FeatureGroup();
  isInDrawingMode: boolean = false;
  defaultOpacity: number = FrontendConstants.MAP_DATA_LAYER_OPACITY;
  selectedRegion$ = new BehaviorSubject<Region | null>(Region.SIERRA_NEVADA);
  edits$ = new BehaviorSubject(false);

  constructor(
    private matSnackBar: MatSnackBar,
    private maps: Map[],
    private readonly mapViewOptions$: BehaviorSubject<MapViewOptions>,
    private popupService: PopupService,
    private session: SessionService,
    private http: HttpClient
  ) {
    this.selectedRegion$ = this.session.region$;
  }

  /** Initializes the map with controls and the layer options specified in its config. */
  initLeafletMap(
    map: Map,
    mapId: string,
    createDetailCardCallback: (
      features: Feature<Geometry, any>[],
      onInitialized: () => void
    ) => any,
    getBoundaryLayerVectorCallback: (vectorName: string) => Observable<L.Layer>
  ) {
    if (map.instance != undefined) map.instance.remove();

    if (map.config.baseLayerType === BaseLayerType.Road) {
      map.baseLayerRef = stadiaAlidadeTiles();
    } else if (map.config.baseLayerType == BaseLayerType.Terrain) {
      map.baseLayerRef = terrainTiles();
    } else {
      map.baseLayerRef = satelliteTiles();
    }

    map.instance = L.map(mapId, {
      center: [...regionMapCenters(this.selectedRegion$.getValue()!)],
      zoom: FrontendConstants.MAP_INITIAL_ZOOM,
      minZoom: FrontendConstants.MAP_MIN_ZOOM,
      maxZoom: FrontendConstants.MAP_MAX_ZOOM,
      layers: [map.baseLayerRef],
      preferCanvas: false, // This needs to be set to false for boundary Tooltip to function
      zoomSnap: 0.5,
      bounceAtZoomLimits: false,
      zoomDelta: 0.5,
      zoomAnimation: true,
      wheelPxPerZoomLevel: 200,
      zoomControl: false,
      pmIgnore: false,
    });

    // Add zoom controls to bottom right corner
    const zoomControl = L.control.zoom({
      position: 'bottomright',
    });
    zoomControl.addTo(map.instance);

    // Init layers, but only add them to the map instance if specified in the map config.
    this.toggleBoundaryLayer(map, getBoundaryLayerVectorCallback);
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
        color: '#000',
        weight: 5,
      },
      templineStyle: {
        color: '#000',
        weight: 5,
      },
      layerGroup: this.drawingLayer,
    });
    map.instance!.pm.setPathOptions(DRAWING_STYLES);

    this.setUpEventHandlers(map, createDetailCardCallback);

    map.existingProjectsLayerRef = this.loadExistingProjectsLayer();
    map.existingProjectsLayerRef.addEventListener('remove', (_) => {
      map.instance?.closePopup();
    });

    this.toggleExistingProjectsLayer(map);
  }

  private setUpEventHandlers(
    map: Map,
    createDetailCardCallback: (
      features: Feature<Geometry, any>[],
      onInitialized: () => void
    ) => any
  ) {
    this.setUpDrawingHandlers(map.instance!);
    this.setUpClickHandler(map, createDetailCardCallback);

    this.setUpPanHandler(map.instance!);
    this.setUpZoomHandler(map.instance!);
  }

  /**
   * Adds a GeoJSON to the drawing layer.
   * @param area  The geoJSON.GeoJSON of the area to add to the drawing layer.
   * @param map  The map
   */
  addGeoJsonToDrawing(area: GeoJSON.GeoJSON, map: Map) {
    L.geoJSON(area, {
      style: (_) => DRAWING_STYLES,
      pmIgnore: false,
      onEachFeature: (feature, layer) => {
        if (feature.geometry.type === 'MultiPolygon') {
          feature.geometry.coordinates.forEach((coord) => {
            const newLayer = transformCoordToLayer(coord);
            newLayer.setStyle(DRAWING_STYLES);
            newLayer.addTo(this.drawingLayer);
            this.addClonedPolygons(newLayer);
            newLayer.on('pm:edit', ({ layer }) => this.editHandler(layer));
          });
        } else {
          layer.addTo(this.drawingLayer);
          this.addClonedPolygons(layer);
          layer.on('pm:edit', ({ layer }) => this.editHandler(layer));
        }
      },
    });

    map.instance?.fitBounds(this.drawingLayer.getBounds());

    this.polygonsCreated$.next(true);
  }

  /**
   * Given the original polygon, adds the cloned polygons to the cloned drawing
   * layer on all maps.
   */
  private addClonedPolygons(layer: L.Layer) {
    this.maps.forEach((currMap) => {
      addClonedLayerToMap(currMap, layer);
    });
  }

  /**
   * Given the original polygon, removes the cloned polygons from the cloned drawing
   * layer on all maps. Optionally deletes the original polygon key.
   */
  private removeClonedPolygons(layer: L.Layer, deleteOriginal: boolean) {
    this.maps.forEach((currMap) => {
      removeClonedLayer(currMap, layer, deleteOriginal);
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
      this.isInDrawingMode = true;
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

    /** Handles exit from drawing mode. */
    map.on('pm:drawend', (event) => {
      this.isInDrawingMode = false;
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
    this.edits$.next(true);
    const editedLayer = layer as L.Polygon;

    // Check if polygon overlaps another
    let overlaps = false;
    this.drawingLayer.getLayers().forEach((feature) => {
      const existingPolygon = feature as L.Polygon;
      // Skip feature with same latlng because that is what's being edited
      if (existingPolygon.getLatLngs() != editedLayer.getLatLngs()) {
        overlaps = areaOverlaps(editedLayer, existingPolygon);
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
    this.matSnackBar.open(
      '[Error] Planning areas cannot overlap!',
      'Dismiss',
      SNACK_ERROR_CONFIG
    );
  }

  private setUpClickHandler(
    map: Map,
    createDetailCardCallback: (
      features: Feature<Geometry, any>[],
      onInitialized: () => void
    ) => any
  ) {
    map.instance!.on('click', (e) => {
      if (!e.latlng) return;
      if (!map.existingProjectsLayerRef) return;

      // if the user is in drawing mode, don't open popups
      if (this.isInDrawingMode) return;

      const intersectingFeatureLayers: L.Polygon[] = [];

      // Get all existing project polygons at the clicked point
      map.existingProjectsLayerRef.eachFeature((featureLayer) => {
        if (featureLayer instanceof L.Polygon && featureLayer.feature) {
          const polygon = featureLayer as L.Polygon;
          // If feature contains the point that was clicked, add to list
          if (
            booleanIntersects(
              point(L.GeoJSON.latLngToCoords(e.latlng)),
              polygon.feature!
            ) ||
            booleanWithin(
              point(L.GeoJSON.latLngToCoords(e.latlng)),
              polygon.feature!
            )
          ) {
            intersectingFeatureLayers.push(polygon);
          }
        }
      });

      if (intersectingFeatureLayers.length === 0) return;

      // Open detail card with all the features present at the clicked point
      const popup: L.Popup = L.popup()
        .setContent(
          createDetailCardCallback(
            intersectingFeatureLayers
              .map((featureLayer) => {
                return (featureLayer as L.Polygon).feature;
              })
              .filter((feature) => !!feature) as Feature<Geometry, any>[],
            () => {
              // After popup content is initialized, update its position and open it.
              popup.update();
              popup.openOn(map.instance!);
            }
          )
        )
        .setLatLng(e.latlng);
    });
  }

  private setUpPanHandler(map: L.Map) {
    if (!this.mapViewOptions$.getValue().center) return;

    // Temporarily disabling to patch region-switch centering bug
    // TODO: Either get rid of locally stored center or change to region-based dictionary
    // map.panTo(this.mapViewOptions$.getValue().center);

    map.addEventListener('moveend', (e) => {
      const mapViewOptions = this.mapViewOptions$.getValue();
      const center = map.getCenter();
      if (
        mapViewOptions.center[0] !== center.lat ||
        mapViewOptions.center[1] !== center.lng
      ) {
        mapViewOptions.center = [center.lat, center.lng];
        this.mapViewOptions$.next(mapViewOptions);
      }
    });
  }

  private setUpZoomHandler(map: L.Map) {
    if (!this.mapViewOptions$.getValue().zoom) return;

    // map.setZoom(this.mapViewOptions$.getValue().zoom);

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
    map.pm.addControls(GEOMAN_DRAW_OPTIONS);
  }

  /** Clears all drawings and cloned drawings. */
  clearAllDrawings() {
    this.drawingLayer.clearLayers();
    this.maps.forEach((currMap) => {
      currMap.clonedDrawingRef!.clearLayers();
      currMap.drawnPolygonLookup = {};
    });
    this.polygonsCreated$.next(false);
  }

  checkIfDrawingInRegion(boundaries: GeoJSON.FeatureCollection) {
    const drawnGeoJson = this.drawingLayer.toGeoJSON() as FeatureCollection;
    return checkIfAreaInBoundaries(drawnGeoJson, boundaries.features[0]);
  }

  /**
   * Converts drawingLayer to GeoJSON. If there are multiple polygons drawn,
   * creates and returns MultiPolygon Geometry. Otherwise, returns a Polygon
   * Geometry.
   */
  convertToPlanningArea(): Geometry {
    const drawnGeoJson = this.drawingLayer.toGeoJSON() as FeatureCollection;
    // Case: Single polygon
    if (drawnGeoJson.features.length <= 1)
      return drawnGeoJson.features?.[0]?.geometry;

    // Case: Multipolygon
    return createMultiPolygonFeatureCollection(drawnGeoJson);
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

  /** Sync pan, zoom, etc. between all maps visible onscreen. */
  syncVisibleMaps(isMapVisible: (index: number) => boolean) {
    this.maps.forEach((mapA, indexA) => {
      this.maps.forEach((mapB, indexB) => {
        if (mapA !== mapB && isMapVisible(indexA) && isMapVisible(indexB)) {
          (mapA.instance as any).sync(mapB.instance);
        } else {
          (mapA.instance as any).unsync(mapB.instance);
        }
      });
    });
  }

  /** Toggles which boundary layer is shown. */
  toggleBoundaryLayer(
    map: Map,
    getBoundaryLayerVectorCallback: (vectorName: string) => Observable<L.Layer>
  ) {
    if (map.instance === undefined) return;

    map.boundaryLayerRef?.remove();

    const boundaryLayerName = map.config.boundaryLayerConfig.boundary_name;
    const boundaryVectorName = map.config.boundaryLayerConfig.vector_name;
    const boundaryShapeName = map.config.boundaryLayerConfig.shape_name;

    if (boundaryLayerName !== '') {
      getBoundaryLayerVectorCallback(boundaryVectorName)
        .pipe(take(1))
        .subscribe((vector) => {
          map.boundaryLayerRef = this.boundaryLayer(
            vector,
            boundaryShapeName,
            map.instance!
          );
          map.boundaryLayerRef.addTo(map.instance!);
        });
    }
  }

  private boundaryLayer(
    boundary: L.Layer,
    shapeName: string,
    map: L.Map
  ): L.Layer {
    return boundary
      .on('mouseover', function (e) {
        var featureName = e.propagatedFrom.properties[shapeName];
        if (featureName == '') {
          featureName = 'UNKNOWN';
        }
        const pops = L.tooltip()
          .setContent(`<div>Name: ${featureName}</div>`)
          .setLatLng(e.latlng)
          .openOn(map);
        e.propagatedFrom.bindTooltip(pops);
        (boundary as unknown as typeof L.vectorGrid).setFeatureStyle(
          e.propagatedFrom.properties.OBJECTID,
          BOUNDARY_LAYER_HOVER_STYLES
        );
      })
      .on('mouseout', function (e) {
        (boundary as unknown as typeof L.vectorGrid).setFeatureStyle(
          e.propagatedFrom.properties.OBJECTID,
          BOUNDARY_LAYER_NORMAL_STYLES
        );
      });
  }

  /** Toggles whether existing projects layer is shown */
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

    let layer = map.config.dataLayerConfig.layer;
    if (layer?.length === 0 || !layer) return;

    let colormap = map.config.dataLayerConfig.colormap;
    if (colormap?.length === 0 || !colormap) {
      colormap = DEFAULT_COLORMAP;
    }

    var region = map.config.dataLayerConfig.region_geoserver_name;
    if (region == null) {
      region = 'sierra-nevada';
    }

    map.dataLayerRef = L.tileLayer.wms(
      environment.tile_endpoint + region + '/wms?',
      {
        layers: region + layer,
        minZoom: FrontendConstants.MAP_MIN_ZOOM,
        maxZoom: FrontendConstants.MAP_MAX_ZOOM,
        format: 'image/png',
        transparent: true,
        opacity:
          map.config.dataLayerConfig.opacity !== undefined
            ? map.config.dataLayerConfig.opacity
            : this.defaultOpacity,
      }
    );

    map.dataLayerRef.addTo(map.instance);

    // Map legend request
    var dataUnit = map.config.dataLayerConfig.data_units;
    const legendUrl = environment.tile_endpoint + 'wms';
    let queryParams = new HttpParams();
    queryParams = queryParams.append('request', 'GetLegendGraphic');
    queryParams = queryParams.append('layer', region + layer);
    queryParams = queryParams.append('format', 'application/json');
    var legendJson = this.http.get<string>(legendUrl, { params: queryParams });
    legendJson.pipe(take(1)).subscribe((value: any) => {
      var colorMap =
        value['Legend'][0]['rules'][0]['symbolizers'][0]['Raster']['colormap'];
      createAndAddLegend(colorMap, dataUnit, map);
    });
  }

  /** Change the opacity of a map's data layer. */
  changeOpacity(map: Map) {
    map.dataLayerRef?.setOpacity(map.config.dataLayerConfig.opacity!);
  }

  loadExistingProjectsLayer() {
    return esri.featureLayer({
      url: 'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/ArcGIS/rest/services/CMDash_v3_view/FeatureServer/2',
      simplifyFactor: 0.5,
      precision: 4,
      where: "PROJECT_STATUS='Active'",
      style: (feature) => {
        return {
          color: '#404040',
          fillColor: '#303030',
        };
      },
      onEachFeature: (feature: Feature<Geometry, any>, layer: L.Layer) => {
        layer.bindTooltip(
          this.popupService.makeDetailsPopup(feature.properties.PROJECT_NAME),
          {
            sticky: true,
          }
        );
        // Exact type of layer (polygon or line) is not known
        if ((layer as any).setStyle) {
          layer.addEventListener('mouseover', (_) =>
            (layer as L.Polygon).setStyle(HOVER_STYLES)
          );
          layer.addEventListener('mouseout', (_) =>
            (layer as L.Polygon).setStyle(NORMAL_STYLES)
          );
        }
      },
    });
  }
}
