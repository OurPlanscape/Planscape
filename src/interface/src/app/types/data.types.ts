import type { LngLat } from 'maplibre-gl';

export enum FormMessageType {
  SUCCESS,
  ERROR,
  ALERT,
}

export interface Pagination<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface Resource<T> {
  isLoading: boolean;
  error?: Error;
  data?: T;
}

export interface LoadedResult<T> extends Omit<Resource<T>, 'error'> {
  data: T;
  isLoading: false;
}

export interface BaseLayerTooltipData {
  content: string;
  longLat: LngLat;
}
