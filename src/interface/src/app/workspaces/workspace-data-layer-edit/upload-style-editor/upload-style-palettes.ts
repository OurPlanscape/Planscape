import { color } from 'd3-color';
import { scaleLinear } from 'd3-scale';

export interface StylePalette {
  name: string;
  // low to high
  colors: string[];
}

export const STYLE_PALETTES: StylePalette[] = [
  {
    // the automatic ramp, from datasets/styles.py
    name: 'Default',
    colors: [
      '#7a0403',
      '#d93807',
      '#fe992c',
      '#d3e835',
      '#64fd6a',
      '#4777ef',
      '#30123b',
    ],
  },
  {
    name: 'Viridis',
    colors: [
      '#440154',
      '#46327e',
      '#365c8d',
      '#277f8e',
      '#1fa187',
      '#4ac16d',
      '#a0da39',
      '#fde725',
    ],
  },
  {
    name: 'Greens',
    colors: ['#f7fcf5', '#c7e9c0', '#74c476', '#238b45', '#00441b'],
  },
  {
    name: 'Reds',
    colors: ['#fff5f0', '#fcbba1', '#fb6a4a', '#cb181d', '#67000d'],
  },
  {
    name: 'Blues',
    colors: ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#08306b'],
  },
  {
    name: 'Red to blue',
    colors: [
      '#b2182b',
      '#ef8a62',
      '#fddbc7',
      '#f7f7f7',
      '#d1e5f0',
      '#67a9cf',
      '#2166ac',
    ],
  },
];

/** `count` colors spread evenly across the palette, as #rrggbb. */
export function paletteColors(palette: StylePalette, count: number): string[] {
  const stops = palette.colors;
  if (count <= 1) {
    return stops.slice(0, Math.max(count, 0));
  }
  const scale = scaleLinear<string>()
    .domain(stops.map((_, i) => i / (stops.length - 1)))
    .range(stops);
  return Array.from(
    { length: count },
    (_, i) => color(scale(i / (count - 1)))?.formatHex() ?? stops[0]
  );
}

export function evenBreaks(min: number, max: number, count: number): number[] {
  if (count <= 1 || min === max) {
    return Array.from({ length: count }, () => min);
  }
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => roundTo(min + step * i, step));
}

// enough decimals to tell neighbouring breaks apart
function roundTo(value: number, step: number) {
  const decimals = Math.max(0, Math.min(6, 2 - Math.floor(Math.log10(step))));
  return Number(value.toFixed(decimals));
}
