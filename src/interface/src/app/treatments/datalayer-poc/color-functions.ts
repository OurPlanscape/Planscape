/**
 * Interfaces describing the structure of the style JSON
 */
export interface NoData {
  values: number[];
  useTransparent?: boolean;
  color?: string;
  opacity?: number;
}

export interface Entry {
  value: number;
  color: string;
  opacity?: number;
}

export interface StyleJson {
  noData?: NoData;
  entries: Entry[];
  rasterColorMapType?: string;
  rasterGamma?: number;
}

/**
 * Creates a color function based on the provided style JSON.
 *
 * @param styleJson Configuration object for handling pixel color and transparency.
 * @returns A function that applies the style rules to each pixel in an RGBA image.
 */
export function makeColorFunction(
  styleJson: StyleJson
): (pixel: number[], rgba: Uint8ClampedArray, metadata: any) => void {
  const { noData, entries, rasterGamma } = styleJson;

  // Convert hex color like "#6a28c7" to [r, g, b].
  function parseHexColor(hex: string): [number, number, number] {
    // remove "#" if present
    const cleaned = hex.replace(/^#/, '');
    const bigint = parseInt(cleaned, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }

  // Gamma function to apply `rasterGamma`
  function applyGamma(
    color: [number, number, number],
    gamma: number
  ): [number, number, number] {
    // color is [r, g, b], each 0-255.
    return color.map((c) => {
      const normalized = c / 255;
      const corrected = Math.pow(normalized, 1 / gamma);
      return Math.round(corrected * 255);
    }) as [number, number, number];
  }

  // This function is called for each pixel: (pixel, rgba, metadata).
  return (pixel: number[], rgba: Uint8ClampedArray, metadata: any): void => {
    const val = pixel[0];

    // 1. Handle noData values if present in the JSON
    if (noData && noData.values.includes(val)) {
      if (noData.useTransparent) {
        rgba.set([0, 0, 0, 0]);
      } else if (noData.color) {
        const [r, g, b] = parseHexColor(noData.color);
        const alpha =
          noData.opacity !== undefined ? Math.round(noData.opacity * 255) : 255;
        rgba.set([r, g, b, alpha]);
      } else {
        // default fallback if noData but no color => transparent
        rgba.set([0, 0, 0, 0]);
      }
      return;
    }

    // 2. If the entry is not noData, handle that data
    let entryOpacity = 255; // default = fully opaque

    // Sort entries by value
    const sorted = entries.slice().sort((a, b) => a.value - b.value);
    let usedEntry: Entry | null = null;
    for (let i = 0; i < sorted.length; i++) {
      if (val <= sorted[i].value) {
        usedEntry = sorted[i];
        break;
      }
    }

    // If val is above all breakpoints, use the last entry
    if (!usedEntry) {
      usedEntry = sorted[sorted.length - 1];
    }

    // Convert color to [r, g, b]
    const parsedColor = parseHexColor(usedEntry.color);
    if (usedEntry.opacity !== undefined) {
      entryOpacity = Math.round(usedEntry.opacity * 255);
    }

    // 3. Apply gamma if needed
    const finalColor =
      rasterGamma && rasterGamma !== 1.0
        ? applyGamma(parsedColor, rasterGamma)
        : parsedColor;

    // 4. Set RGBA
    rgba.set([finalColor[0], finalColor[1], finalColor[2], entryOpacity]);
  };
}
