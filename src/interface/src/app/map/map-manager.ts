import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient, HttpParams } from '@angular/common/http';
import booleanIntersects from '@turf/boolean-intersects';
import booleanWithin from '@turf/boolean-within';
import { point } from '@turf/helpers';
import {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Polygon,
} from 'geojson';
import * as L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import 'leaflet.sync';
import { BehaviorSubject, Observable, take } from 'rxjs';

import { BackendConstants } from '../backend-constants';
import { PopupService, SessionService } from '../services';
import {
  BaseLayerType,
  BoundaryConfig,
  DEFAULT_COLORMAP,
  FrontendConstants,
  regionMapCenters,
  Map,
  Region,
  MapViewOptions,
} from '../types';

// Set to true so that layers are not editable by default
L.PM.setOptIn(true);

/**
 * Helper class to manage initialization and modification of Leaflet maps.
 * All logic that touches Leaflet layers or objects should live here instead
 * of in map.component.ts.
 */
export class MapManager {
  boundaryVectorCache = new Map<string, L.Layer>();
  polygonsCreated$ = new BehaviorSubject<boolean>(false);
  drawingLayer = new L.FeatureGroup();
  isInDrawingMode: boolean = false;
  defaultOpacity: number = FrontendConstants.MAP_DATA_LAYER_OPACITY;
  selectedRegion$ = new BehaviorSubject<Region | null>(Region.SIERRA_NEVADA);

  constructor(
    private matSnackBar: MatSnackBar,
    private maps: Map[],
    private readonly mapViewOptions$: BehaviorSubject<MapViewOptions>,
    private popupService: PopupService,
    private session: SessionService,
    private startLoadingLayerCallback: (layerName: string) => void,
    private doneLoadingLayerCallback: (layerName: string) => void,
    private http: HttpClient
    ) {
      this.selectedRegion$ = this.session.region$;
    }

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
    createDetailCardCallback: (
      features: Feature<Geometry, any>[],
      onInitialized: () => void
    ) => any,
    getBoundaryLayerVectorCallback: (
      vectorName: string
    ) => Observable<L.Layer>
  ) {
    if (map.instance != undefined) map.instance.remove();

    if (map.config.baseLayerType === BaseLayerType.Road) {
      map.baseLayerRef = this.stadiaAlidadeTiles();
    } else if (map.config.baseLayerType == BaseLayerType.Terrain) {
      map.baseLayerRef = this.terrainTiles();
    } else {
      map.baseLayerRef = this.satelliteTiles();
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
    existingProjectsGeoJson$.subscribe((projects: GeoJSON.GeoJSON | null) => {
      if (projects) {
        this.initCalMapperLayer(map, projects);
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
        color: '#3367D6',
        weight: 5,
      },
      templineStyle: {
        color: '#3367D6',
        weight: 5,
      },
      layerGroup: this.drawingLayer,
    });
    map.instance!.pm.setPathOptions({
      color: '#3367D6',
      fillColor: '#3367D6',
      fillOpacity: 0.1,
      weight: 5,
    });

    this.setUpEventHandlers(map, createDetailCardCallback);
  }

  /** Creates a basemap layer using the Esri.WorldTerrain tiles. */
  private terrainTiles() {
    return L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 13,
        attribution: 'Tiles &copy; Esri &mdash; Source: USGS, Esri, TANA, DeLorme, and NPS',
        zIndex: 0,
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
        zIndex: 0,
      }
    );
  }

  /** Creates a basemap layer using the Esri.WorldImagery tiles. */
  private satelliteTiles() {
    return L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        zIndex: 0,
      }
    );
  }

  /** Renders the existing project boundaries + metadata in a popup in an optional layer. */
  private initCalMapperLayer(map: Map, existingProjects: GeoJSON.GeoJSON) {
    const normalStyle: L.PathOptions = {
      color: '#000000',
      weight: 1,
      opacity: 0.5,
    };
    const hoverStyle: L.PathOptions = {
      color: '#ff0000',
      weight: 5,
      opacity: 0.9,
    };

    // [elsieling] This step makes the map less responsive
    map.existingProjectsLayerRef = L.geoJSON(existingProjects, {
      style: normalStyle,
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
            (layer as L.Polygon).setStyle(hoverStyle)
          );
          layer.addEventListener('mouseout', (_) =>
            (layer as L.Polygon).setStyle(normalStyle)
          );
        }
      },
    });

    if (map.config.showExistingProjectsLayer) {
      map.instance?.addLayer(map.existingProjectsLayerRef);
    }

    // When the existing projects layer is removed, close any popups.
    map.existingProjectsLayerRef.addEventListener('remove', (_) => {
      map.instance?.closePopup();
    });
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
        color: '#3367D6',
        fillColor: '#3367D6',
        fillOpacity: 0.1,
        weight: 5,
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
        weight: 5,
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
      (map.existingProjectsLayerRef as L.GeoJSON).eachLayer((featureLayer) => {
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

  /** Clears all drawings and cloned drawings. */
  clearAllDrawings() {
    this.drawingLayer.clearLayers();
    this.maps.forEach((currMap) => {
      currMap.clonedDrawingRef!.clearLayers();
      currMap.drawnPolygonLookup = {};
    });
    this.polygonsCreated$.next(false);
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

  /** Toggles which base layer is shown. */
  changeBaseLayer(map: Map) {
    let baseLayerType = map.config.baseLayerType;
    map.baseLayerRef?.remove();
    if (baseLayerType === BaseLayerType.Terrain) {
      map.baseLayerRef = this.terrainTiles();
    } else if (baseLayerType === BaseLayerType.Road) {
      map.baseLayerRef = this.stadiaAlidadeTiles();
    } else if (baseLayerType === BaseLayerType.Satellite) {
      map.baseLayerRef = this.satelliteTiles();
    }
    map.instance?.addLayer(map.baseLayerRef!);
  }

  /** Toggles which boundary layer is shown. */
  toggleBoundaryLayer(
    map: Map,
    getBoundaryLayerVectorCallback: (
      vectorName: string
    ) => Observable<L.Layer>
  ) {
    if (map.instance === undefined) return;

    map.boundaryLayerRef?.remove();

    const boundaryLayerName = map.config.boundaryLayerConfig.boundary_name;
    const boundaryVectorName = map.config.boundaryLayerConfig.vector_name;
    const boundaryShapeName = map.config.boundaryLayerConfig.shape_name;
    
    if (boundaryLayerName !== '') {
      this.startLoadingLayerCallback(boundaryLayerName);
      getBoundaryLayerVectorCallback(boundaryVectorName)
        .pipe(take(1))
        .subscribe((vector) => {
          this.doneLoadingLayerCallback(boundaryLayerName);
          this.boundaryVectorCache.set(boundaryLayerName, vector);
          map.boundaryLayerRef = this.boundaryLayer(vector, boundaryShapeName, map.instance!);
          map.boundaryLayerRef.addTo(map.instance!);
          }
        )
    }
  }

  private boundaryLayer(boundary: L.Layer, shapeName: string, map: L.Map):  L.Layer {
    const normalStyle: L.PathOptions = {
      weight: 1,
      color: '#0000ff',
      fillOpacity: 0,
      fill: true,
    };
    const hoverStyle: L.PathOptions = {
      weight: 5,
      color: '#0000ff',
      fillOpacity: 0.5,
      fill: true,
    };
      return boundary.on('mouseover', function(e) {
        var featureName = e.propagatedFrom.properties[shapeName];
        if (featureName==''){
          featureName= 'UNKNOWN';
        }
        const pops = L.tooltip()
          .setContent(`<div>Name: ${featureName}</div>`)
          .setLatLng(e.latlng)
          .openOn(map);
        e.propagatedFrom.bindTooltip(pops);
        (boundary as unknown as typeof L.vectorGrid).setFeatureStyle(e.propagatedFrom.properties.OBJECTID, hoverStyle);
      }).on('mouseout', function(e){
        (boundary as unknown as typeof L.vectorGrid).setFeatureStyle(e.propagatedFrom.properties.OBJECTID, normalStyle);        
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

  addLegend(colormap: any, map: Map) {
    var entries = colormap['entries'];
    const legend = new (L.Control.extend({
      options: { position: 'topleft' }
    }));
    const mapRef = map;
    legend.onAdd = function (map) {
      // Remove any pre-existing legend on map
      if (mapRef.legend) {
        L.DomUtil.remove(mapRef.legend);
      }

      const div = L.DomUtil.create('div', 'legend');
      var htmlContent = '';
      htmlContent += '<div class=parentlegend>';
      htmlContent += '<div><b>Legend</b></div>';
        for (let i = 0; i < entries.length; i++) {
          var entry = entries[i]
          // Add a margin-bottom to only the last entry in the legend
          var lastChild = "";
          if (i == entries.length -1) {
            lastChild = 'style="margin-bottom: 6px;"';
          }
          if (entry['label']) {
            var label = entry['label'];
            if (label == 'nodata') {
              htmlContent += '<nodata>&#x2327 N/D<br/></nodata>';
              
            } else {
              htmlContent += '<div class="legendline" '+ lastChild+ '><i style="background:'+ entry['color'] + '"> &emsp; &hairsp;</i> &nbsp;<label>'
              + label + '<br/></label></div>';
            }
          } else {
            htmlContent += '<div class="legendline" '+ lastChild+ '><i style="background:'+ entry['color'] + '"> &emsp; &hairsp;</i> &nbsp; <br/></div>';
          }
      }
      htmlContent += '</div>';
      div.innerHTML = htmlContent;
      // Needed to allow for scrolling on the legend 
      L.DomEvent.on(div, 'mousewheel', L.DomEvent.stopPropagation)
      // Set reference to legend for later deletion
      mapRef.legend = div;
      return div;
    };
    legend.addTo(map.instance!);
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
      BackendConstants.TILES_END_POINT + region + "/wms?" ,
      {
        layers: layer,
        minZoom: 7,
        maxZoom: 13,
        opacity:
          map.config.dataLayerConfig.opacity !== undefined
            ? map.config.dataLayerConfig.opacity
            : this.defaultOpacity,
      }
    );

    map.dataLayerRef.addTo(map.instance);
    
    // Map legend request
    const legendUrl = BackendConstants.TILES_END_POINT + 'wms';
    let queryParams = new HttpParams();
    queryParams = queryParams.append("request", "GetLegendGraphic");
    queryParams = queryParams.append("layer", layer);
    queryParams = queryParams.append("format", "application/json");
    var legendJson = this.http.get<string>(legendUrl,{params:queryParams});
    legendJson
      .pipe(take(1))
      .subscribe((value:any) => {
        var colorMap = value['Legend'][0]['rules'][0]['symbolizers'][0]['Raster']['colormap'];
        this.addLegend(colorMap, map);
      });
  }

  /** Change the opacity of a map's data layer. */
  changeOpacity(map: Map) {
    map.dataLayerRef?.setOpacity(map.config.dataLayerConfig.opacity!);
  }
}

