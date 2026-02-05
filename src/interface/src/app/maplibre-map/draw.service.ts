import { Injectable } from '@angular/core';
import { TerraDraw } from 'terra-draw';
import { FeatureId } from 'terra-draw/dist/extend';
import bbox from '@turf/bbox';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import { Map as MapLibreMap } from 'maplibre-gl';
import { acresForFeature } from '@app/maplibre-map/maplibre.helper';
import { Feature, feature, MultiPolygon, Polygon } from '@turf/helpers';
import {
  BehaviorSubject,
  catchError,
  Observable,
  of,
  tap,
  shareReplay,
} from 'rxjs';
import { GeoJSON } from 'geojson';
import booleanWithin from '@turf/boolean-within';
import { HttpClient } from '@angular/common/http';
import area from '@turf/area';
import Decimal from 'decimal.js';

export type DrawMode = 'polygon' | 'select' | 'none';

export const DefaultSelectConfig = {
  flags: {
    polygon: {
      feature: {
        draggable: true,
        coordinates: {
          midpoints: {
            draggable: true,
          },
          draggable: true,
          snappable: true,
          deletable: true,
        },
      },
    },
  },
};

@Injectable()
export class DrawService {
  private _terraDraw: TerraDraw | null = null;
  private _currentDrawingMode$ = new BehaviorSubject<string>('');

  // Observable that components can subscribe to
  currentDrawingMode$: Observable<string> =
    this._currentDrawingMode$.asObservable();

  private _selectedFeatureId$ = new BehaviorSubject<FeatureId | null>(null);
  selectedFeatureId$: Observable<FeatureId | null> =
    this._selectedFeatureId$.asObservable();

  private _totalAcres$ = new BehaviorSubject<number>(0);
  totalAcres$: Observable<number> = this._totalAcres$.asObservable();

  private _boundaryShape$ = new BehaviorSubject<GeoJSON | null>(null);

  private _mapRef: MapLibreMap | null = null;

  private _uploadedShape: GeoJSON.GeoJSON | null = null;

  constructor(private http: HttpClient) {}

  initializeTerraDraw(map: MapLibreMap, modes: any[]) {
    this._mapRef = map;
    const mapLibreAdapter = new TerraDrawMapLibreGLAdapter({
      map: map,
      renderBelowLayerId: 'drawing-hook',
    });
    if (!this._terraDraw) {
      this._terraDraw = new TerraDraw({
        adapter: mapLibreAdapter,
        modes: modes,
      });
      this._terraDraw.start();
    }
    this._terraDraw?.on('select', (selectedFeatureId) => {
      this._selectedFeatureId$.next(selectedFeatureId);
    });
    this._terraDraw?.on('deselect', () => {
      this._selectedFeatureId$.next(null);
    });
    this._terraDraw?.on('finish', (featureId: FeatureId) => {
      this.setMode('select');
      this.selectFeature(featureId);
      this.updateTotalAcreage();
    });
  }

  //idempotent - start if not started
  start() {
    if (this._terraDraw && !this._terraDraw.enabled) {
      this._terraDraw.start();
    }
  }

  stop() {
    if (!this._terraDraw || !this._terraDraw.enabled) {
      return;
    }
    this._terraDraw.stop();
    this._totalAcres$.next(0);
  }

  getMode() {
    return this._terraDraw?.getMode();
  }

  setMode(mode: DrawMode) {
    if (!this._terraDraw || !this._terraDraw.enabled) {
      return;
    }
    this._terraDraw.setMode(mode);
    this._currentDrawingMode$.next(this._terraDraw.getMode());
  }

  deleteSelectedFeature() {
    const curSelectedId = this._selectedFeatureId$.getValue();
    if (curSelectedId) {
      this._terraDraw?.removeFeatures([curSelectedId]);
    }
    this.updateTotalAcreage();
  }

  getTerraDraw(): TerraDraw | null {
    return this._terraDraw;
  }

  registerFinish(finishCallback: Function) {
    this._terraDraw?.on('finish', (featureId: FeatureId) => {
      this.setMode('select');
      this.selectFeature(featureId);
      this.updateTotalAcreage();
      finishCallback(featureId);
    });
  }

  registerChangeCallback(changeCallback: Function) {
    this._terraDraw?.on('change', (changedFeatureIds, type, context) => {
      changeCallback(changedFeatureIds, type, context);
    });
  }

  getPolygonPointCount(featureId: FeatureId) {
    const snapshot = this._terraDraw?.getSnapshotFeature(featureId);
    if (snapshot?.geometry.type === 'Polygon') {
      return snapshot?.geometry.coordinates[0].length;
    }
    return 0;
  }

  getPolygonBottomCenterCoords(featureId: FeatureId) {
    const featureCopy = this._terraDraw?.getSnapshotFeature(featureId);
    if (featureCopy) {
      const bboxResult = bbox(featureCopy);
      if (!bboxResult) {
        return null;
      }
      const [minLng, minLat, maxLng, _] = bboxResult;
      const centerLng = (minLng + maxLng) / 2;
      const bottomLat = minLat;
      return [centerLng, bottomLat];
    } else {
      return null;
    }
  }

  getBboxFromUploadedShape() {
    return bbox(this.getUploadedShape());
  }

  getBboxFromDrawingContext() {
    return bbox(this.getDrawingGeoJSON());
  }

  selectFeature(featureId: FeatureId) {
    this._terraDraw?.selectFeature(featureId);
  }

  currentSelectedFeature() {
    this._terraDraw?.getFeatureId;
  }

  hasPolygonFeatures() {
    if (!this._terraDraw) {
      return false;
    } else if (this._uploadedShape) {
      return true;
    }
    return (
      this._terraDraw.getSnapshot().filter((f) => f.geometry.type === 'Polygon')
        .length > 0
    );
  }

  clearFeatures() {
    this._terraDraw?.clear();
    this._totalAcres$.next(0);
    this.removeUploadedShapeLayer();
  }

  removeUploadedShapeLayer(): void {
    if (!this._mapRef) {
      return;
    }
    if (this._mapRef.getLayer('uploaded-shape-outline')) {
      this._mapRef.removeLayer('uploaded-shape-outline');
    }
    if (this._mapRef.getLayer('uploaded-shape-fill')) {
      this._mapRef.removeLayer('uploaded-shape-fill');
    }
    if (this._mapRef.getSource('uploaded-shape')) {
      this._mapRef.removeSource('uploaded-shape');
    }
    this._uploadedShape = null;
  }

  isDrawingWithinBoundary(): boolean {
    const polygons = this.getPolygonsSnapshot();
    const shape = this._boundaryShape$.value;
    if (polygons && shape?.type === 'FeatureCollection' && shape.features) {
      // all polygons must be within at least one of the shape features
      const result = polygons.every((p) => {
        return shape.features.some((f) => booleanWithin(p.geometry, f));
      });
      return result;
    }
    return false;
  }

  getPolygonsSnapshot() {
    return this._terraDraw
      ?.getSnapshot()
      .filter((f) => f.geometry.type === 'Polygon');
  }

  updateTotalAcreage() {
    const geoJSON = this.getDrawingGeoJSON();
    if (this._uploadedShape) {
      this._totalAcres$.next(this.calculateUploadedAcres());
    } else if (geoJSON.geometry.coordinates.length > 0) {
      const acres = acresForFeature(geoJSON);
      this._totalAcres$.next(acres);
    } else {
      this._totalAcres$.next(0);
    }
  }

  loadDrawingBoundary(): Observable<GeoJSON | null> {
    if (this._boundaryShape$.value !== null) {
      return this._boundaryShape$.asObservable();
    }
    return this.http.get<GeoJSON>('assets/geojson/conus-census.geojson').pipe(
      catchError((error) => {
        console.error('Failed to load shape:', error);
        return of(null); // Return null on error
      }),
      tap((shape) => this._boundaryShape$.next(shape)),
      shareReplay(1)
    );
  }

  getDrawingGeoJSON() {
    const polygons = this.getPolygonsSnapshot();
    const polygonFeatures = polygons as Feature<Polygon>[];
    const coordinates = polygonFeatures.map(
      (feature) => feature.geometry.coordinates
    );
    const combinedGeometry: MultiPolygon = {
      type: 'MultiPolygon',
      coordinates,
    };
    return feature(combinedGeometry);
  }

  getCurrentAcreageValue() {
    return this._totalAcres$.value;
  }

  hasUploadedData() {
    return !!this._uploadedShape;
  }

  getUploadedShape() {
    if (!this._uploadedShape) {
      return null;
    }
    if (this._uploadedShape?.type === 'Feature') {
      return this._uploadedShape?.geometry;
    }
    if (this._uploadedShape.type === 'FeatureCollection') {
      return this._uploadedShape.features.length > 0
        ? this._uploadedShape.features[0].geometry
        : null;
    }
    return this._uploadedShape as GeoJSON.Geometry;
  }

  addUploadedFeatures(geoJSONShape: GeoJSON.GeoJSON) {
    if (!this._mapRef) {
      return;
    }
    this._uploadedShape = geoJSONShape;
    if (!this._mapRef.getSource('uploaded-shape')) {
      this.initializeUploadedShapeLayer();
    }
    const source = this._mapRef.getSource(
      'uploaded-shape'
    ) as maplibregl.GeoJSONSource;
    source.setData(this._uploadedShape);
    this.updateTotalAcreage();
  }

  private initializeUploadedShapeLayer(): void {
    if (!this._mapRef) {
      return;
    }
    this._mapRef.addSource('uploaded-shape', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });
    this._mapRef.addLayer(
      {
        id: 'uploaded-shape-fill',
        type: 'fill',
        source: 'uploaded-shape',
        paint: {
          'fill-color': '#A5C8D7',
          'fill-opacity': 0.5,
        },
      },
      'drawing-hook' // adding this on the map just "before" this layer
    );
    this._mapRef.addLayer(
      {
        id: 'uploaded-shape-outline',
        type: 'line',
        source: 'uploaded-shape',
        paint: {
          'line-color': '#000',
          'line-width': 2,
        },
      },
      'drawing-hook' // adding this on the map just "before" this layer
    );
  }

  calculateUploadedAcres() {
    if (!this._uploadedShape) {
      return 0;
    }

    const conversionAcresToSqMeters = Decimal('4046.8564213562374');
    let areaInSquareMeters: number;
    if (this._uploadedShape.type === 'FeatureCollection') {
      areaInSquareMeters = area(
        this._uploadedShape as GeoJSON.FeatureCollection
      );
    } else if (this._uploadedShape.type === 'Feature') {
      areaInSquareMeters = area(this._uploadedShape as GeoJSON.Feature);
    } else {
      areaInSquareMeters = area({
        type: 'Feature',
        geometry: this._uploadedShape as GeoJSON.Geometry,
        properties: {},
      });
    }
    const areaInAcres = Decimal(areaInSquareMeters).div(
      conversionAcresToSqMeters
    );
    return areaInAcres.toNumber();
  }
}
