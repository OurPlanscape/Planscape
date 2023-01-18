export const DEFAULT_COLORMAP = 'turbo';
export const NONE_COLORMAP = 'none';

export interface ColormapConfig {
  name?: string;
  values?: ColormapValue[];
}

export interface ColormapValue {
  name?: string;
  percentile?: number;
  rgb?: string;
}

export interface Legend {
  colors?: string[];
  labels?: string[];
}

/** Convert a colormap to a legend object. */
export function colormapConfigToLegend(
  colormap: ColormapConfig
): Legend | undefined {
  const sortedValues = colormap.values?.sort((valueA, valueB) => {
    if (valueA?.percentile != undefined && valueB?.percentile != undefined) {
      return valueA.percentile - valueB.percentile;
    }
    return 0;
  });
  return {
    colors: sortedValues?.map((value) => (!!value.rgb ? value.rgb : '')),
    labels: sortedValues?.map((value) => (!!value.name ? value.name : '')),
  };
}
