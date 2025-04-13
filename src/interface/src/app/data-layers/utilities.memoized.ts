import { scaleLinear } from 'd3-scale';
import { color as d3Color } from 'd3-color';
import { DataLayer, LayerStyleEntry, Entry, StyleJson, ColorLegendInfo } from '@types';
import memoizerific from 'memoizerific';

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

export function extractLegendInfo(dataLayer: DataLayer): ColorLegendInfo {
  const { map_type, entries } = dataLayer.styles[0].data;
  const sorted = [...entries].sort((a, b) => a.value - b.value);
  const colorDetails: LayerStyleEntry[] = sorted.map((e: Entry) => {
    return {
      colorHex: e.color ?? '',
      entryLabel: e.label ?? '',
    };
  });
  return { title: dataLayer.name, type: map_type, entries: colorDetails };
}

/**
 * Converts a hex/color string to an RGBA object.
 */
function parseColor(hexColor: string, opacity = 1.0): RGBA {
  const c = d3Color(hexColor);
  if (!c) return TRANSPARENT;

  const rgbObj = c.rgb();
  return {
    r: rgbObj.r,
    g: rgbObj.g,
    b: rgbObj.b,
    a: opacity,
  };
}

/**
 * Writes an RGBA color to the destination buffer.
 */
function writeColorToBuffer(rgbaData: Uint8ClampedArray, color: RGBA): void {
  const a = Math.round(color.a * 255);
  rgbaData.set([color.r, color.g, color.b, a]);
}

function prebufferColors(entries: Entry[]): Map<number, RGBA> {
  const colorCache = new Map<number, RGBA>();

  for (const entry of entries) {
    const rgba = parseColor(entry.color, entry.opacity ?? 1.0);
    colorCache.set(entry.value, rgba);
  }

  return colorCache;
}

/**
 * Pre-computes interval thresholds and their associated colors.
 */
function prebufferIntervalColors(sortedEntries: Entry[]): [number, RGBA][] {
  return sortedEntries.map((entry) => [
    entry.value,
    parseColor(entry.color, entry.opacity ?? 1.0),
  ]);
}

/**
 * Pre-computes scales for RAMP mapping to avoid rebuilding them for each pixel.
 */
const prebufferRampScales = memoizerific(1000)((sortedEntries: Entry[]): {
  colorScale: ReturnType<typeof scaleLinear<string>>;
  opacityScale: ReturnType<typeof scaleLinear<number>>;
} => {
  const domain = sortedEntries.map((entry) => entry.value);
  const colorRange = sortedEntries.map((entry) => entry.color);
  const opacityRange = sortedEntries.map((entry) => entry.opacity ?? 1.0);

  const colorScale = scaleLinear<string>().domain(domain).range(colorRange).clamp(true);
  const opacityScale = scaleLinear<number>().domain(domain).range(opacityRange).clamp(true);

  return { colorScale, opacityScale };
});

/**
 * Creates a function that returns a color based on VALUE mapping.
 */
function createValuesColorMapper(entries: Entry[]): (value: number) => RGBA {
  const valueMap = prebufferColors(entries);

  return (value: number) => {
    return valueMap.get(value) || TRANSPARENT;
  };
}

/**
 * Creates a function that returns a color based on INTERVALS mapping.
 */
function createIntervalsColorMapper(sortedEntries: Entry[]): (value: number) => RGBA {
  if (sortedEntries.length === 0) {
    return () => TRANSPARENT;
  }

  const thresholds = prebufferIntervalColors(sortedEntries);

  return (value: number) => {
    if (value <= thresholds[0][0]) {
      return thresholds[0][1];
    }

    for (let i = 1; i < thresholds.length; i++) {
      if (value <= thresholds[i][0]) {
        return thresholds[i][1];
      }
    }

    return thresholds[thresholds.length - 1][1];
  };
}

/**
 * Creates a function that returns a color based on RAMP mapping.
 */
function createRampColorMapper(sortedEntries: Entry[]): (value: number) => RGBA {
  const { colorScale, opacityScale } = prebufferRampScales(sortedEntries);

  return (value: number) => {
    const interpolatedColor = colorScale(value);
    const interpolatedOpacity = opacityScale(value);

    return parseColor(interpolatedColor, interpolatedOpacity);
  };
}

/**
 * Creates a color mapper for a single entry.
 */
function createSingleEntryMapper(entry: Entry): (value: number) => RGBA {
  const color = parseColor(entry.color, entry.opacity ?? 1.0);
  return () => color;
}

/**
 * Creates a color mapper with memoization.
 */
const createColorMapper = (styleJson: StyleJson) => {
  const { map_type, no_data, entries } = styleJson;

  const noDataSet = new Set(no_data?.values || []);
  let colorMapper: (value: number) => RGBA;

  if (entries.length === 0) {
    colorMapper = () => TRANSPARENT;
  } else if (entries.length === 1) {
    colorMapper = createSingleEntryMapper(entries[0]);
  } else {
    switch (map_type) {
      case 'VALUES':
        colorMapper = createValuesColorMapper(entries);
        break;
      case 'INTERVALS':
        const sortedEntries = [...entries].sort((a, b) => a.value - b.value);
        colorMapper = createIntervalsColorMapper(sortedEntries);
        break;
      case 'RAMP':
        const sortedRampEntries = [...entries].sort((a, b) => a.value - b.value);
        colorMapper = createRampColorMapper(sortedRampEntries);
        break;
      default:
        colorMapper = () => TRANSPARENT;
    }
  }

  return { noDataSet, colorMapper };
};

/**
 * Main function that creates a pixel coloring function based on style configuration.
 */
export function makeColorFunction(
  styleJson: StyleJson,
  clearCache = false
): (pixel: number[], rgba: Uint8ClampedArray) => void {


  const { noDataSet, colorMapper } = createColorMapper(styleJson);

  return (pixel: number[], rgba: Uint8ClampedArray) => {
    const value = pixel[0];

    if (noDataSet.has(value)) {
      writeColorToBuffer(rgba, TRANSPARENT);
      return;
    }

    const color = colorMapper(value);
    writeColorToBuffer(rgba, color);
  };
}
