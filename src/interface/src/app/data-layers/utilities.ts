import { scaleLinear } from 'd3-scale';
import { color as d3Color } from 'd3-color';

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

export function makeColorFunction(
  styleJson: StyleJson
): (pixel: number[], rgba: Uint8ClampedArray) => void {
  const { map_type, no_data, entries } = styleJson;
  const sorted = entries.slice().sort((a, b) => a.value - b.value);

  // For a RAMP, build a scale
  let rampColorFn: ((val: number) => [number, number, number, number]) | null =
    null;
  if (map_type === 'RAMP' && sorted.length >= 2) {
    const domain = sorted.map((e) => e.value);
    const colorStrings = sorted.map((e) => e.color);
    const colorScale = scaleLinear<string>()
      .domain(domain)
      .range(colorStrings)
      .clamp(true);
    const alphaValues = sorted.map((e) => e.opacity ?? 1.0);
    const alphaScale = scaleLinear<number>()
      .domain(domain)
      .range(alphaValues)
      .clamp(true);

    rampColorFn = (val: number) => {
      const c = d3Color(colorScale(val));
      if (!c) return [0, 0, 0, 0];
      const rgbObj = c.rgb();
      const a = alphaScale(val);
      return [rgbObj.r, rgbObj.g, rgbObj.b, a];
    };
  }

  function setPixelColor(
    rgbaData: Uint8ClampedArray,
    hex: string,
    opacity = 1.0
  ) {
    const c = d3Color(hex);
    if (!c) {
      rgbaData.set([0, 0, 0, 0]);
      return;
    }
    const rgbObj = c.rgb();
    const a = Math.round(opacity * 255);
    rgbaData.set([rgbObj.r, rgbObj.g, rgbObj.b, a]);
  }

  return (pixel: number[], rgba: Uint8ClampedArray) => {
    const val = pixel[0];

    if (no_data?.values?.includes(val)) {
      if (no_data.color) {
        setPixelColor(rgba, no_data.color, no_data.opacity ?? 0);
      } else {
        rgba.set([0, 0, 0, 0]);
      }
      return;
    }

    switch (map_type) {
      case 'VALUES': {
        const entry = sorted.find((e) => e.value === val);
        if (entry) {
          setPixelColor(rgba, entry.color, entry.opacity ?? 1.0);
        } else {
          rgba.set([0, 0, 0, 0]);
        }
        return;
      }

      case 'INTERVALS': {
        if (val <= sorted[0].value) {
          const first = sorted[0];
          setPixelColor(rgba, first.color, first.opacity ?? 1.0);
          return;
        }
        let chosen = sorted[sorted.length - 1];
        for (let i = 0; i < sorted.length; i++) {
          if (val <= sorted[i].value) {
            chosen = sorted[i];
            break;
          }
        }
        setPixelColor(rgba, chosen.color, chosen.opacity ?? 1.0);
        return;
      }

      case 'RAMP':
      default: {
        if (rampColorFn && sorted.length >= 2) {
          const [r, g, b, aFloat] = rampColorFn(val);
          const a = Math.round(aFloat * 255);
          rgba.set([r, g, b, a]);
        } else if (sorted.length === 1) {
          const only = sorted[0];
          setPixelColor(rgba, only.color, only.opacity ?? 1.0);
        } else {
          rgba.set([0, 0, 0, 0]);
        }
        return;
      }
    }
  };
}
