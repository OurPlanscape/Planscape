import { scaleLinear } from 'd3-scale';
import { rgb } from 'd3-color';

export interface NoData {
  values: number[];
  color?: string;
  opacity?: number;
  label?: string;
}

export interface Entry {
  value: number;
  color: string;
  opacity?: number;
  label?: string | null;
}

export interface StyleJson {
  map_type: 'RAMP' | 'INTERVALS' | 'VALUES';
  no_data?: NoData;
  entries: Entry[];
}

// Pre-compute RGB values from hex colors
interface RGBEntry extends Entry {
  rgbColor: [number, number, number];
}

export function makeColorFunction(
  styleJson: StyleJson
): (pixel: number[], rgba: Uint8ClampedArray) => void {
  const { map_type, no_data, entries } = styleJson;

  // Pre-compute no_data values as a Set
  const noDataSet = no_data?.values ? new Set(no_data.values) : new Set();

  // Pre-compute RGB values for all entries
  const rgbEntries: RGBEntry[] = entries.map((entry) => {
    const color = rgb(entry.color);
    return {
      ...entry,
      rgbColor: [color.r, color.g, color.b],
    };
  });

  const sorted = [...rgbEntries].sort((a, b) => a.value - b.value);

  // VALUES map type optimization - create a lookup map
  const valuesMap =
    map_type === 'VALUES'
      ? new Map(sorted.map((entry) => [entry.value, entry]))
      : null;

  // RAMP optimization - pre-compute scales
  let rampRGBScales:
    | [
        (val: number) => number,
        (val: number) => number,
        (val: number) => number,
        (val: number) => number,
      ]
    | null = null;

  if (map_type === 'RAMP' && sorted.length >= 2) {
    const domain = sorted.map((e) => e.value);
    const alphaValues = sorted.map((e) => e.opacity ?? 1.0);

    // Create separate scales for R, G, B components for better performance
    const rScale = scaleLinear<number>()
      .domain(domain)
      .range(sorted.map((e) => e.rgbColor[0]))
      .clamp(true);

    const gScale = scaleLinear<number>()
      .domain(domain)
      .range(sorted.map((e) => e.rgbColor[1]))
      .clamp(true);

    const bScale = scaleLinear<number>()
      .domain(domain)
      .range(sorted.map((e) => e.rgbColor[2]))
      .clamp(true);

    const alphaScale = scaleLinear<number>()
      .domain(domain)
      .range(alphaValues)
      .clamp(true);

    rampRGBScales = [rScale, gScale, bScale, alphaScale];
  }

  // Reusable transparent RGBA array
  const transparent = [0, 0, 0, 0];

  // Main color function
  return (pixel: number[], rgba: Uint8ClampedArray) => {
    const val = pixel[0];

    // Fast path for no_data values
    if (noDataSet.has(val)) {
      rgba.set(transparent);
      return;
    }

    switch (map_type) {
      case 'VALUES': {
        // O(1) lookup using Map
        const entry = valuesMap?.get(val);
        if (entry) {
          const [r, g, b] = entry.rgbColor;
          rgba[0] = r;
          rgba[1] = g;
          rgba[2] = b;
          rgba[3] = Math.round((entry.opacity ?? 1.0) * 255);
        } else {
          rgba.set(transparent);
        }
        return;
      }

      case 'INTERVALS': {
        // Fast path for values below the first interval
        if (val <= sorted[0].value) {
          const first = sorted[0];
          const [r, g, b] = first.rgbColor;
          rgba[0] = r;
          rgba[1] = g;
          rgba[2] = b;
          rgba[3] = Math.round((first.opacity ?? 1.0) * 255);
          return;
        }

        // Fast path for values above the last interval
        if (val > sorted[sorted.length - 1].value) {
          const last = sorted[sorted.length - 1];
          const [r, g, b] = last.rgbColor;
          rgba[0] = r;
          rgba[1] = g;
          rgba[2] = b;
          rgba[3] = Math.round((last.opacity ?? 1.0) * 255);
          return;
        }

        // Binary search to find the right interval
        let low = 0;
        let high = sorted.length - 1;

        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          if (val <= sorted[mid].value) {
            high = mid - 1;
          } else {
            low = mid + 1;
          }
        }

        const chosen = sorted[low];
        const [r, g, b] = chosen.rgbColor;
        rgba[0] = r;
        rgba[1] = g;
        rgba[2] = b;
        rgba[3] = Math.round((chosen.opacity ?? 1.0) * 255);
        return;
      }

      case 'RAMP':
      default: {
        if (rampRGBScales && sorted.length >= 2) {
          const [rScale, gScale, bScale, alphaScale] = rampRGBScales;
          rgba[0] = rScale(val);
          rgba[1] = gScale(val);
          rgba[2] = bScale(val);
          rgba[3] = Math.round(alphaScale(val) * 255);
        } else if (sorted.length === 1) {
          const [r, g, b] = sorted[0].rgbColor;
          rgba[0] = r;
          rgba[1] = g;
          rgba[2] = b;
          rgba[3] = Math.round((sorted[0].opacity ?? 1.0) * 255);
        } else {
          rgba.set(transparent);
        }
        return;
      }
    }
  };
}
