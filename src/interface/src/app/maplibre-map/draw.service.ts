import { Injectable } from '@angular/core';
import { TerraDraw, GeoJSONStoreFeatures } from 'terra-draw';
import * as turf from '@turf/turf';
import { BehaviorSubject, Observable } from 'rxjs';
import { Geometry } from '@turf/helpers';
import { FeatureId } from 'terra-draw/dist/extend';

export type DrawMode = 'polygon' | 'select' | 'none';

@Injectable()
export class DrawService {
  private _terraDraw: TerraDraw | null = null;
  private _currentDrawingMode = new BehaviorSubject<string>('');

  // Observable that components can subscribe to
  currentDrawingMode$: Observable<string> =
    this._currentDrawingMode.asObservable();

  private _selectedFeatureId$ = new BehaviorSubject<FeatureId | null>(null);
  selectedFeatureId$: Observable<FeatureId | null> =
    this._selectedFeatureId$.asObservable();

  initializeTerraDraw(adapter: any, modes: any[]) {
    if (!this._terraDraw) {
      this._terraDraw = new TerraDraw({
        adapter: adapter,
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
  }

  //idempotent - start if not started
  start() {
    if (this._terraDraw && !this._terraDraw.enabled) {
      this._terraDraw.start();
    }
  }

  stop() {
    //stops all drawing
    this._terraDraw?.stop();
  }

  getMode() {
    return this._terraDraw?.getMode();
  }

  setMode(mode: DrawMode) {
    if (this._terraDraw) {
      this._terraDraw.setMode(mode);
      this._currentDrawingMode.next(this._terraDraw.getMode());
    }
  }

  deleteSelectedFeature() {
    const curSelectedId = this._selectedFeatureId$.getValue();
    if (curSelectedId) {
      this._terraDraw?.removeFeatures([curSelectedId]);
    }
  }

  getTerraDraw(): TerraDraw | null {
    return this._terraDraw;
  }

  registerFinish(finishCallback: Function) {
    this._terraDraw?.on('finish', (featureId: any, context: any) => {
      this.setMode('select');
      this.selectFeature(featureId);
      finishCallback(featureId);
    });
  }

  registerChangeCallback(changeCallback: Function) {
    this._terraDraw?.on('change', (changedFeatureIds) => {
      changeCallback(changedFeatureIds);
    });
  }

  getPolygonPointCount(featureId: string) {
    const snapshot = this._terraDraw?.getSnapshotFeature(featureId);
    if (snapshot?.geometry.type === 'Polygon') {
      return snapshot?.geometry.coordinates[0].length;
    }
    return 0;
  }

  getPolygonBottomCenterCoords(featureId: FeatureId) {
    const featureCopy = this._terraDraw?.getSnapshotFeature(featureId);
    if (featureCopy) {
      const bboxResult = turf.bbox(featureCopy);
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

  selectFeature(featureId: number) {
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

  getTotalAcreage() {
    // sums acreage of all polygons
    const polygons = this.getPolygonsSnapshot();
    if (!polygons) {
      return 0;
    }
    return polygons.reduce((total, p) => total + this.calculateAcreage(p), 0);
  }

  clearFeatures() {
    this._terraDraw?.clear();
  }

  getPolygonsSnapshot() {
    return this._terraDraw
      ?.getSnapshot()
      .filter((f) => f.geometry.type === 'Polygon');
  }

  getGeometry(): Geometry | null {
    // TODO : use updated acreage calculation
    const polygons = this.getPolygonsSnapshot();
    if (!polygons) {
      return null;
    } else if (polygons.length > 1) {
      return {
        type: 'MultiPolygon',
        coordinates: polygons.map((p) => p.geometry.coordinates) as number[][],
      };
    } else {
      return polygons[0].geometry;
    }
  }

  //TODO: use updated acreage measurement when added
  calculateAcreage(polygon: GeoJSONStoreFeatures): number {
    if (!turf.booleanValid(polygon)) {
      return 0;
    }
    const CONVERSION_SQM_ACRES = 4046.8564213562374;
    const areaInSquareMeters = turf.area(polygon);
    const areaInAcres = areaInSquareMeters / CONVERSION_SQM_ACRES;
    return areaInAcres;
  }
}
