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
  blue: ['#BBDEFB', '#64B5F6', '#2196F3', '#1976D2', '#0D47A1'],
  purple: ['#E1BEE7', '#BA68C8', '#9C27B0', '#7B1FA2', '#4A148C'],
  orange: ['#FFE0B2', '#FFB74D', '#FF9800', '#F57C00', '#E65100'],
  green: ['#C8E6C9', '#81C784', '#43A047', '#2E7D32', '#1B5E20'],
};
