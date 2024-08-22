import { BehaviorSubject, map } from 'rxjs';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export type BaseLayerType =
  | 'road'
  | 'terrain'
  | 'satellite'
  | 'arcgisTopographic'
  | 'arcgisImagery'
  | 'arcgisGray';

const stadiaMaps = 'https://tiles.stadiamaps.com/styles/';
const arcgis =
  'https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/arcgis/';

export const baseLayerUrls: Record<BaseLayerType, string> = {
  road:
    stadiaMaps + 'alidade_smooth.json?api_key=' + environment.stadiamaps_key,
  terrain:
    stadiaMaps + 'stamen_terrain.json?api_key=' + environment.stadiamaps_key,
  satellite:
    stadiaMaps + 'alidade_satellite.json?api_key=' + environment.stadiamaps_key,
  arcgisTopographic: arcgis + 'topographic?token=' + environment.arcgis_key,
  arcgisImagery: arcgis + 'imagery?token=' + environment.arcgis_key,
  arcgisGray: arcgis + 'light-gray?token=' + environment.arcgis_key,
};

@Injectable()
export class MapConfigState {
  private _baseLayer$ = new BehaviorSubject<BaseLayerType>('road');
  baseLayer$ = this._baseLayer$.asObservable();
  baseLayerUrl$ = this.baseLayer$.pipe(map((b) => baseLayerUrls[b]));

  updateBaseLayer(layer: BaseLayerType) {
    this._baseLayer$.next(layer);
  }
}
