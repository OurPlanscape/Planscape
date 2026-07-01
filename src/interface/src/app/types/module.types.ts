import { BaseDataSet, BaseLayer, DataLayer } from './data-sets';

export interface ApiModule<T> {
  name: string;
  options: T;
}

export interface ForsysData {
  inclusions: BaseLayer[];
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
export interface SubUnits {
  datasets: {
    main_datasets: MapDataDataSet[];
    base_datasets: MapDataDataSet[];
  };
  sub_units: BaseLayer[];
}

export interface MapDataDataSet extends BaseDataSet {
  preferred_display_type: 'MAIN_DATALAYERS' | 'BASE_DATALAYERS';
  selection_type: 'SINGLE' | 'MULTIPLE';
}

/**
 * The `funding_report` module: a fixed set of data layers grouped by the report
 * sections they belong to (carbon, water, biomass, wildfire risk reduction).
 */
export interface FundingReportModuleData {
  datasets: {
    main_datasets: MapDataDataSet[];
    base_datasets: MapDataDataSet[];
  };
  datalayers: FundingReportDataLayers;
}

export interface FundingReportDataLayers {
  carbon: DataLayer[];
  water: DataLayer[];
  /** Vector layers (mills) shown as multi-select base layers. */
  biomass: BaseLayer[];
  wildfire_risk_reduction: DataLayer[];
}
