export interface Metric {
  id: string;
  label: string;
}

export interface MapMetric {
  metric: Metric;
  slot: MapMetricSlot;
}

export const METRICS: Metric[] = [
  {
    id: 'CROWN_BULK_DENSITY',
    label: 'Crown Bulk Density',
  },
  {
    id: 'CANOPY_BASE_HEIGHT',
    label: 'Canopy Base Height',
  },
  {
    id: 'CANOPY_COVER',
    label: 'Canopy Cover',
  },
  {
    id: 'LARGE_TREE_BIOMASS',
    label: 'Large Tree Biomass',
  },
  {
    id: 'MERCHANTABLE_BIOMASS',
    label: 'Merchantable Biomass',
  },
  {
    id: 'NON_MERCHANTABLE_BIOMASS',
    label: 'Non-Merchantable Biomass',
  },
  {
    id: 'MORTALITY',
    label: 'Mortality',
  },
  {
    id: 'POTENTIAL_SMOKE',
    label: 'Potential Smoke',
  },
  {
    id: 'PROBABILITY_OF_TORCHING',
    label: 'Probability of Torching',
  },
  {
    id: 'QUADRATIC_MEAN_DIAMETER',
    label: 'Quadratic Mean Diameter',
  },
  {
    id: 'STAND_DENSITY_INDEX',
    label: 'Stand Density Index',
  },
  {
    id: 'TOTAL_HEIGHT',
    label: 'Total Height',
  },
  {
    id: 'TOTAL_FLAME_SEVERITY',
    label: 'Total Flame Severity',
  },
  {
    id: 'TOTAL_CARBON',
    label: 'Total Carbon',
  },
];

export type MapMetricSlot = 'blue' | 'purple' | 'orange' | 'green';

export const SLOT_COLORS: Record<MapMetricSlot, string> = {
  blue: '#4361EE',
  purple: '#9071E8',
  orange: '#EC933A',
  green: '#63C2A2',
};

export const SLOT_PALETTES: Record<
  MapMetricSlot,
  [string, string, string, string, string]
> = {
  blue: ['#4895EF', '#4361EE', '#3F37C9', '#1264B6', '#0D4A86'],
  purple: ['#C2A9E5', '#A47BE5', '#9071E8', '#764ABF', '#5D2E99'],
  orange: ['#F3B072', '#F1A45C', '#EC933A', '#D67D2F', '#B56425'],
  green: ['#A5E3D2', '#7FD1B8', '#63C2A2', '#4CA98B', '#368F76'],
};
