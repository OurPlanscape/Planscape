import { BaseLayer } from './data-sets';
import { IdNamePair } from './general';

export interface ApiModule<T> {
  name: string;
  options: T;
}

export interface ForsysData {
  inclusions: IdNamePair[];
  exclusions: BaseLayer[];
  thresholds: {
    slope: { id: number };
    distance_from_roads: { id: number };
  };
}
