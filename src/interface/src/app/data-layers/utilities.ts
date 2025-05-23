import { scaleLinear } from 'd3-scale';
import { color as d3Color } from 'd3-color';
import {
  DataLayer,
  LayerStyleEntry,
  Entry,
  StyleJson,
  ColorLegendInfo,
} from '@types';
import { TypedArray } from '@geomatico/maplibre-cog-protocol/dist/types';

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

// Determines the legend format based on the datalayer
export function extractLegendInfo(dataLayer: DataLayer): ColorLegendInfo {
  const { map_type, entries } = dataLayer.styles[0].data;
  // Note that this sort inverts the values from high to low
  const sorted = [...entries].sort((a, b) => b.value - a.value);
  const title = unitsTitleFromLayer(dataLayer);
  const colorDetails: LayerStyleEntry[] = sorted.map((e: Entry) => {
    return {
      colorHex: e.color ?? '',
      entryLabel: e.label ?? '',
    };
  });
  return { title: title, type: map_type, entries: colorDetails };
}

function unitsTitleFromLayer(dataLayer: DataLayer): string {
  const defaultTitle = 'Legend';
  let units = dataLayer.metadata?.['metadata']?.[
    'identification'
  ]?.keywords?.units?.keywords?.filter((unit: any) => !!unit);
  if (!units || units.length === 0) {
    return defaultTitle;
  }
  const title = units.join(', ');
  // Until further notice, we're substituting this title
  if (title === '0-1') {
    return defaultTitle;
  }
  return title;
}

// maps hexcolor string to an RGB object with integer values
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

// generates a color mapping function for single entry maps
function createSingleEntryMapper(entry: Entry): (value: number) => RGBA {
  const color = parseColor(entry.color, entry.opacity ?? 1.0);
  return () => color;
}

// for VALUES maps, parses the colors in advance
function prebufferValuesColors(entries: Entry[]): Map<number, RGBA> {
  const parsedColors = new Map<number, RGBA>();

  for (const entry of entries) {
    const rgba = parseColor(entry.color, entry.opacity ?? 1.0);
    parsedColors.set(entry.value, rgba);
  }
  return parsedColors;
}
// color function just for VALUES mapping.
function createValuesColorMapper(entries: Entry[]): (value: number) => RGBA {
  const valueMap = prebufferValuesColors(entries);
  return (value: number) => {
    return valueMap.get(value) || TRANSPARENT;
  };
}

// precalculates colors for INTERVALS map type
function prebufferIntervalsColors(sortedEntries: Entry[]): [number, RGBA][] {
  return sortedEntries.map((entry) => [
    entry.value,
    parseColor(entry.color, entry.opacity ?? 1.0),
  ]);
}
// returns a function for INTERVALS map type
function createIntervalsColorMapper(
  sortedEntries: Entry[]
): (value: number) => RGBA {
  if (sortedEntries.length === 0) {
    return () => TRANSPARENT;
  }
  const thresholds = prebufferIntervalsColors(sortedEntries);
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

// calculates scales in advance for RAMP map type
const prebufferRampScales = (
  sortedEntries: Entry[]
): {
  colorScale: ReturnType<typeof scaleLinear<string>>;
  opacityScale: ReturnType<typeof scaleLinear<number>>;
} => {
  const domain = sortedEntries.map((entry) => entry.value);
  const colorRange = sortedEntries.map((entry) => entry.color);
  const opacityRange = sortedEntries.map((entry) => entry.opacity ?? 1.0);

  const colorScale = scaleLinear<string>()
    .domain(domain)
    .range(colorRange)
    .clamp(true);
  const opacityScale = scaleLinear<number>()
    .domain(domain)
    .range(opacityRange)
    .clamp(true);

  return { colorScale, opacityScale };
};
// returns color map for RAMP types
function createRampColorMapper(
  sortedEntries: Entry[]
): (value: number) => RGBA {
  const { colorScale, opacityScale } = prebufferRampScales(sortedEntries);

  return (value: number) => {
    const interpolatedColor = colorScale(value);
    const interpolatedOpacity = opacityScale(value);

    return parseColor(interpolatedColor, interpolatedOpacity);
  };
}

const determineColorFunction = (
  styleJson: StyleJson
): ((value: number) => RGBA) => {
  const { map_type, entries } = styleJson;

  if (entries.length === 0) {
    return () => TRANSPARENT;
  } else if (entries.length === 1) {
    return createSingleEntryMapper(entries[0]);
  } else {
    switch (map_type) {
      case 'VALUES':
        return createValuesColorMapper(entries);
      case 'INTERVALS':
        const sortedEntries = [...entries].sort((a, b) => a.value - b.value);
        return createIntervalsColorMapper(sortedEntries);
      case 'RAMP':
        const sortedRampEntries = [...entries].sort(
          (a, b) => a.value - b.value
        );
        return createRampColorMapper(sortedRampEntries);
      default:
        return () => TRANSPARENT;
    }
  }
};

//  sets rgbaData and rounds alpha value to passed arg
function writeColorToBuffer(rgbaData: Uint8ClampedArray, color: RGBA): void {
  const a = Math.round(color.a * 255);
  rgbaData.set([color.r, color.g, color.b, a]);
}

export function generateColorFunction(
  styleJson: StyleJson
): (pixel: TypedArray, rgba: Uint8ClampedArray) => void {
  const knownNoDataValues = new Set(styleJson.no_data?.values || []);
  const colorMapper = determineColorFunction(styleJson);
  return (pixel: TypedArray, rgba: Uint8ClampedArray) => {
    const value = pixel[0];

    if (knownNoDataValues.has(value)) {
      writeColorToBuffer(rgba, TRANSPARENT);
      return;
    }

    const color = colorMapper(value);
    writeColorToBuffer(rgba, color);
  };
}
