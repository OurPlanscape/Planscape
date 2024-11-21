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
    id: 'CBD',
    label: 'Crown Bulk Density',
  },
  {
    id: 'CBH',
    label: 'Canopy Base Height',
  },
  {
    id: 'CC',
    label: 'Canopy Cover',
  },
  {
    id: 'LARGE_TREE_BIOMASS',
    label: 'Large Tree Biomass',
  },
  {
    id: 'MERCH_BIOMASS',
    label: 'Merchantable Biomass',
  },
  {
    id: 'NON_MERCH_BIOMASS',
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
    id: 'PTORCH',
    label: 'Probability of Torching',
  },
  {
    id: 'QMD',
    label: 'Quadratic Mean Diameter',
  },
  {
    id: 'SDI',
    label: 'Stand Density Index',
  },
  {
    id: 'TH',
    label: 'Total Height',
  },
  {
    id: 'TOT_FLAME_SEV',
    label: 'Total Flame Severity',
  },
  {
    id: 'TOTAL_CARBON',
    label: 'Total Carbon',
  },
];

export type MapMetricSlot = 'blue' | 'purple' | 'orange' | 'green';
export const DEFAULT_SLOT: MapMetricSlot = 'blue';

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
