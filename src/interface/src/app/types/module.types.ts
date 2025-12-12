import { BaseDataSet, BaseLayer } from './data-sets';
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

export interface MapData {
  datasets: {
    main_datasets: MapDataDataSet[];
    base_datasets: MapDataDataSet[];
  };
}

export interface MapDataDataSet extends BaseDataSet {
  preferred_display_type: 'MAIN_DATALAYERS' | 'BASE_DATALAYERS';
  selection_type: 'SINGLE' | 'MULTIPLE';
}
