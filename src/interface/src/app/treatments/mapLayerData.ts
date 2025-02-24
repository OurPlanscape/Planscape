import {
  BASE_COLORS,
  BASE_STANDS_PAINT,
  LABEL_PAINT,
  PROJECT_AREA_OUTLINE_PAINT,
  SELECTED_STANDS_PAINT,
  SINGLE_STAND_HOVER,
  SINGLE_STAND_SELECTED,
  STANDS_CELL_PAINT,
} from './map.styles';
import { LayerSpecification } from 'maplibre-gl';

export type MapLayerData = {
  readonly id: string;
  readonly sourceLayer: string;
  paint?: LayerSpecification['paint'];
  color?: string;
};
export type TreatmentMapLayer =
  | 'projectAreasOutline'
  | 'projectAreasHighlight'
  | 'projectAreasFill'
  | 'projectAreaLabels';
export type TreatmentStandsLayer =
  | 'projectAreaOutline'
  | 'standsOutline'
  | 'stands'
  | 'selectedStands'
  | 'sequenceStands';
export const projectAreaLayers: Record<TreatmentMapLayer, MapLayerData> = {
  projectAreasOutline: {
    id: 'map-project-areas-line',
    sourceLayer: 'project_areas_by_scenario',
    color: BASE_COLORS.dark,
  },
  projectAreasHighlight: {
    id: 'map-project-areas-highlight',
    sourceLayer: 'project_areas_by_scenario',
    color: BASE_COLORS.yellow,
  },
  projectAreasFill: {
    id: 'map-project-areas-fill',
    sourceLayer: 'project_areas_by_scenario',
  },
  projectAreaLabels: {
    id: 'map-project-areas-labels',
    sourceLayer: 'project_areas_by_scenario_label',
    paint: LABEL_PAINT,
  },
};
export const mapStandsLayers: Record<TreatmentStandsLayer, MapLayerData> = {
  projectAreaOutline: {
    id: 'outline-layer',
    sourceLayer: 'project_area_aggregate',
    paint: PROJECT_AREA_OUTLINE_PAINT,
  },
  standsOutline: {
    id: 'stands-outline-layer',
    sourceLayer: 'stands_by_tx_plan',
    paint: STANDS_CELL_PAINT,
  },
  stands: {
    id: 'stands-layer',
    sourceLayer: 'stands_by_tx_plan',
    paint: BASE_STANDS_PAINT,
  },
  sequenceStands: {
    id: 'stands-sequence-layer',
    sourceLayer: 'stands_by_tx_plan',
    paint: {
      'fill-pattern': 'sequence1',
      'fill-opacity': 1,
    },
  },
  selectedStands: {
    id: 'stands-layer-selected',
    sourceLayer: 'stands_by_tx_plan',
    paint: SELECTED_STANDS_PAINT as any,
  },
};
export const directImpactLayers: Record<
  'ResultsStandsFill' | 'ResultsStandsSelected' | 'ResultsStandsHover',
  MapLayerData
> = {
  ResultsStandsFill: {
    id: 'standsFill',
    sourceLayer: 'stands_by_tx_result',
    paint: {
      'fill-color': '#FFF',
      'fill-opacity': 0,
    },
  },
  ResultsStandsSelected: {
    id: 'standSelected',
    sourceLayer: 'stands_by_tx_plan',
    paint: SINGLE_STAND_SELECTED,
  },
  ResultsStandsHover: {
    id: 'standHover',
    sourceLayer: 'treatment_stands',
    paint: SINGLE_STAND_HOVER,
  },
};
