import { Injectable } from '@angular/core';
import {
  TerraDraw,
  GeoJSONStoreFeatures
} from 'terra-draw';
import * as turf from '@turf/turf';
import { BehaviorSubject, Observable } from 'rxjs';
import { Geometry } from '@turf/helpers';
export type DrawMode = 'polygon' | 'select' | 'none';


@Injectable({
  providedIn: 'root'
})
export class DrawService {

  constructor() { }
  private _terraDraw: TerraDraw | null = null;
  private _currentDrawingMode = new BehaviorSubject<string>('');

  // Observable that components can subscribe to
  currentDrawingMode$: Observable<string> = this._currentDrawingMode.asObservable();

  initializeTerraDraw(adapter: any, modes: any[]) {
    if (!this._terraDraw) {
      this._terraDraw = new TerraDraw({
        adapter: adapter,
        modes: modes
      });
      this._terraDraw.start();
    }
  }

  getTerraDraw(): TerraDraw | null {
    return this._terraDraw;
  }

  //idempotent - start if not started
  start() {
    if (this._terraDraw && !this._terraDraw.enabled) {
      this._terraDraw.start();
    }
  }

  registerFinish() {
    this._terraDraw?.on('finish', (id: any, context: any) => {
      this.setMode('select');
      this.selectFeature(id);
    })
  }

  stop() {
    this._terraDraw?.stop();
  }

  setMode(mode: DrawMode) {
    if (this._terraDraw) {
      this._terraDraw.setMode(mode);
      this._currentDrawingMode.next(this._terraDraw.getMode());
    }
  }

  selectFeature(featureId: number) {
    this._terraDraw?.selectFeature(featureId);
  }

  hasPolygonFeatures() {
    if (!this._terraDraw) {
      return false;
    }
    return this._terraDraw.getSnapshot().filter((f) => f.geometry.type === 'Polygon').length > 0;
  }

  getTotalAcreage() {
    // TODO: keep this in the service?
    const polygons = this.getPolygonsSnapshot();
    if (!polygons) {
      return 0;
    }
    return polygons.reduce((total, p) => total + this.calculateAcreage(p), 0)
  }

  clearFeatures() {
    this._terraDraw?.clear();
  }

  getPolygonsSnapshot() {
    return this._terraDraw?.getSnapshot().filter((f) => f.geometry.type === 'Polygon');
  }

  getGeometry(): Geometry | null {
    //TODO: terradraw doesn't seem to provide a Multipolygon result,
    // so we convert it here -- maybe easier w turf?
    const polygons = this.getPolygonsSnapshot();
    if (!polygons) {
      return null;
    }
    else if (polygons.length > 1) {
      return {
        type: "MultiPolygon",
        coordinates: polygons.map(p => p.geometry.coordinates) as number[][]
      };
    } else {
      return polygons[0].geometry;
    }
  }


  //TODO: complete this PoC to match our backend acreage measurement
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
