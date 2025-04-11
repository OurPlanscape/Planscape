import { scaleLinear } from 'd3-scale';
import { rgb } from 'd3-color';
import { DataLayer, LayerStyleEntry, ColorLegendInfo, Entry, StyleJson } from '@types';

interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Extended Entry with pre-computed RGB values
 */
interface RGBEntry extends Entry {
  rgbColor: {r: number, g: number, b: number};  // Pre-computed RGB components
}

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
 * Creates a color mapping function based on the provided style configuration
 * 
 * @param styleJson - Configuration object for color mapping
 * @returns A function that maps pixel values to RGBA colors
 */
export function makeColorFunction(
  styleJson: StyleJson
): (pixel: number[], rgba: Uint8ClampedArray) => void {
  const { map_type, no_data, entries } = styleJson;
  
  // Pre-compute set of no-data values for O(1) lookup
  const noDataSet = no_data?.values ? new Set(no_data.values) : new Set();
  
  // Pre-compute RGB values for all entries to avoid repeated color parsing
  const rgbEntries: RGBEntry[] = entries.map((entry) => {
    const parsedColor = rgb(entry.color);
    return {
      ...entry,
      rgbColor: {
        r: parsedColor.r,
        g: parsedColor.g,
        b: parsedColor.b
      },
    };
  });
  
  // Sort entries by value for binary search and interpolation
  const sorted = [...rgbEntries].sort((a, b) => a.value - b.value);
  
  // For 'VALUES' type, create a lookup map for O(1) access
  const valuesMap = map_type === 'VALUES'
    ? new Map(sorted.map((entry) => [entry.value, entry]))
    : null;
  
  // For 'RAMP' type, pre-compute color scales
  let colorScaler: ((val: number) => RGBAColor) | null = null;
  
  if (map_type === 'RAMP' && sorted.length >= 2) {
    const domain = sorted.map((e) => e.value);
    const alphaValues = sorted.map((e) => e.opacity ?? 1.0);
    
    // Create separate scales for each color component
    const rScale = scaleLinear<number>()
      .domain(domain)
      .range(sorted.map((e) => e.rgbColor.r))
      .clamp(true);
    
    const gScale = scaleLinear<number>()
      .domain(domain)
      .range(sorted.map((e) => e.rgbColor.g))
      .clamp(true);
    
    const bScale = scaleLinear<number>()
      .domain(domain)
      .range(sorted.map((e) => e.rgbColor.b))
      .clamp(true);
    
    const alphaScale = scaleLinear<number>()
      .domain(domain)
      .range(alphaValues)
      .clamp(true);
    
    // Create a function that returns a complete RGBA color object
    colorScaler = (val: number): RGBAColor => ({
      r: rScale(val),
      g: gScale(val),
      b: bScale(val),
      a: Math.round(alphaScale(val) * 255)
    });
  }
  
  // Reusable transparent RGBA color
  const transparent: RGBAColor = { r: 0, g: 0, b: 0, a: 0 };
  
  /**
   * Helper function to apply a color to the output array
   */
  const applyColor = (color: RGBAColor, output: Uint8ClampedArray): void => {
    output[0] = color.r;
    output[1] = color.g;
    output[2] = color.b;
    output[3] = color.a;
  };
  
  /**
   * Get color from an entry
   */
  const getColorFromEntry = (entry: RGBEntry): RGBAColor => ({
    r: entry.rgbColor.r,
    g: entry.rgbColor.g,
    b: entry.rgbColor.b,
    a: Math.round((entry.opacity ?? 1.0) * 255)
  });
  
  /**
   * The color mapping function that converts pixel values to RGBA
   * @param pixel - Input pixel value array
   * @param rgba - Output RGBA array to be modified
   */
  return (pixel: number[], rgba: Uint8ClampedArray) => {
    const val = pixel[0];
    let resultColor: RGBAColor;
    
    // Fast path for no-data values
    if (noDataSet.has(val)) {
      applyColor(transparent, rgba);
      return;
    }
    
    // Apply the appropriate color mapping strategy
    switch (map_type) {
      case 'VALUES': {
        // Direct map lookup - O(1) complexity
        const entry = valuesMap?.get(val);
        if (entry) {
          resultColor = getColorFromEntry(entry);
        } else {
          resultColor = transparent;
        }
        break;
      }
      
      case 'INTERVALS': {
        // Handle edge cases first for better performance
        // Values below first interval
        if (val <= sorted[0].value) {
          resultColor = getColorFromEntry(sorted[0]);
        }
        // Values above last interval
        else if (val > sorted[sorted.length - 1].value) {
          resultColor = getColorFromEntry(sorted[sorted.length - 1]);
        }
        else {
          // Binary search to find the appropriate interval - O(log n) complexity
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
          
          resultColor = getColorFromEntry(sorted[low]);
        }
        break;
      }
      
      case 'RAMP':
      default: {
        // Smooth interpolation between values
        if (colorScaler && sorted.length >= 2) {
          resultColor = colorScaler(val);
        } else if (sorted.length === 1) {
          // Handle single entry case
          resultColor = getColorFromEntry(sorted[0]);
        } else {
          // No entries case
          resultColor = transparent;
        }
        break;
      }
    }
    
    // Apply the resulting color to the output array
    applyColor(resultColor, rgba);
  };
}
