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

const MEMOIZE_EVICTION = 100;

// Determines the legend format based on the datalayer
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

// maps hexcolor string to an RGB object
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
  console.log('creating singly entry map');
  const color = parseColor(entry.color, entry.opacity ?? 1.0);
  return () => color;
}

// for VALUES maps, parses the colors in advance
function prebufferValuesColors(entries: Entry[]): Map<number, RGBA> {
  console.log('creating values  map');
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


// precalculates colors for INTERVAL map type
function prebufferIntervalColors(sortedEntries: Entry[]): [number, RGBA][] {
  console.log('creating intervals map');
  return sortedEntries.map((entry) => [
    entry.value,
    parseColor(entry.color, entry.opacity ?? 1.0),
  ]);
}
// returns a function for INTERVAL map type
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


// calculates scales in advance for RAMP map type
const prebufferRampScales = (sortedEntries: Entry[]): {
  colorScale: ReturnType<typeof scaleLinear<string>>;
  opacityScale: ReturnType<typeof scaleLinear<number>>;
} => {
  console.log('creating ramps map');
  const domain = sortedEntries.map((entry) => entry.value);
  const colorRange = sortedEntries.map((entry) => entry.color);
  const opacityRange = sortedEntries.map((entry) => entry.opacity ?? 1.0);

  const colorScale = scaleLinear<string>().domain(domain).range(colorRange).clamp(true);
  const opacityScale = scaleLinear<number>().domain(domain).range(opacityRange).clamp(true);

  return { colorScale, opacityScale };
};
// returns color map for RAMP types
function createRampColorMapper(sortedEntries: Entry[]): (value: number) => RGBA {
  const { colorScale, opacityScale } = prebufferRampScales(sortedEntries);

  return (value: number) => {
    const interpolatedColor = colorScale(value);
    const interpolatedOpacity = opacityScale(value);

    return parseColor(interpolatedColor, interpolatedOpacity);
  };
}

const determineColorFunction = (styleJson: StyleJson): (value: number) => RGBA => {
  const { map_type, entries } = styleJson;
  //memoize as the styleJson is changed
  const memoizedRampFunction = memoizerific(MEMOIZE_EVICTION)(createRampColorMapper);

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
        const sortedRampEntries = [...entries].sort((a, b) => a.value - b.value);
       return memoizedRampFunction(sortedRampEntries);
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


export function generateColorFunction(styleJson: StyleJson): 
(pixel: number[], rgba: Uint8ClampedArray) => void {
  const noDataValues = new Set(styleJson.no_data?.values || []);
  const colorMapper = determineColorFunction(styleJson);
  return (pixel: number[], rgba: Uint8ClampedArray) => {
    const value = pixel[0];

    if (noDataValues.has(value)) {
      writeColorToBuffer(rgba, TRANSPARENT);
      return;
    }

    const color = colorMapper(value);
    writeColorToBuffer(rgba, color);
  };
}