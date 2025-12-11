import { Injectable } from '@angular/core';
import { TerraDraw } from 'terra-draw';
import { FeatureId } from 'terra-draw/dist/extend';
import bbox from '@turf/bbox';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import { Map as MapLibreMap } from 'maplibre-gl';
import { acresForFeature } from '../maplibre-map/maplibre.helper';
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
import { flattenMultipolygons, stripZCoords } from '../plan/plan-helpers';
import { InvalidCoordinatesError } from '@services/errors';

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

  constructor(private http: HttpClient) {}

  initializeTerraDraw(map: MapLibreMap, modes: any[]) {
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
    }
    return (
      this._terraDraw.getSnapshot().filter((f) => f.geometry.type === 'Polygon')
        .length > 0
    );
  }

  clearFeatures() {
    this._terraDraw?.clear();
    this._totalAcres$.next(0);
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
    // if we have no features, set acres to 0
    if (geoJSON.geometry.coordinates.length > 0) {
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

  addGeoJSONFeature(shape: any) {
    const featuresArray = shape.features.map((feature: any) => ({
      type: 'Feature',
      geometry: {
        type: feature.geometry.type,
        coordinates: roundCoordinates(feature.geometry.coordinates, 6),
      },
      properties: {
        ...feature.properties,
        mode: 'polygon',
      },
    }));
    let flatFeatures = flattenMultipolygons(featuresArray);
    flatFeatures = stripZCoords(flatFeatures);
    const validations = this._terraDraw?.addFeatures(flatFeatures);
    handleValidation(validations);
    this.updateTotalAcreage();
    this._terraDraw?.setMode('select'); // should be in select mode to add
  }
}

function handleValidation(validations: any[] | undefined): void {
  if (validations?.some((feature) => feature.valid === false)) {
    const reasons = getValidationReasons(validations);
    if (
      reasons.some((reason: string) => reason.includes('invalid coordinates'))
    ) {
      throw new InvalidCoordinatesError(reasons.join(', '));
    } else {
      throw new Error(`Error: ${reasons.join(', ')} `);
    }
  }
}

function getValidationReasons(validations: any[]) {
  return validations
    .filter((validation) => !validation.valid && validation.reason)
    .map((validation) => validation.reason);
}

// terra-draw only accepts up to 6 decimal places of precision, so this rounds that
// Note that 6 decimal places translates to about ~11 cm (4.3 inches)
function roundCoordinates(coords: any, precision = 6) {
  if (typeof coords[0] === 'number') {
    return coords.map(
      (coord: any) =>
        Math.round(coord * Math.pow(10, precision)) / Math.pow(10, precision)
    );
  } else {
    return coords.map((coord: any) => roundCoordinates(coord, precision));
  }
}
