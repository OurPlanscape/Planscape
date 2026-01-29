import { FeatureCollection, UsageType } from '@types';
import { ChartConfiguration, ChartDataset } from 'chart.js';

// Base font configuration
const baseFont = {
  family: 'Public Sans',
  size: 14,
  style: 'normal',
  weight: '600',
};

export const getChartFontConfig = (): any => {
  return baseFont;
};

export const getChartPaddingConfiguration = (): any => ({
  left: 0,
  right: 24,
  top: 0,
  bottom: 0,
});

// Define the dash pattern (4px dash, 4px gap)
export const getChartBorderDash = (): any => {
  return [5, 5];
};

export const getSharedGridConfig = (yAxis = true): any =>
  yAxis
    ? {
        drawBorder: false, // Remove the border along the y-axis
        drawTicks: false,
        lineWidth: 1, // Set line width for dotted lines
        color: '#979797', // Dotted line color
        borderDash: getChartBorderDash(),
      }
    : {
        display: false, // Disable grid lines for the x-axis
        drawBorder: false, // Remove the bottom border (x-axis line)
        drawTicks: false, // Remove the tick marks on the x-axis
      };

export const getSharedTicksConfig = (yAxis = true): any =>
  yAxis
    ? {
        color: '#4A4A4A',
        font: baseFont as any,
        padding: 24,
        stepSize: 50,
        callback: (value: any) => `${value}%`,
      }
    : {
        autoSkip: false,
        maxRotation: 0,
        minRotation: 0,
        font: baseFont,
        padding: 24,
      };

export const getSharedDataLabelsConfig = (): any => ({
  color: '#000',
  backgroundColor: '#fff',
  anchor: (context: any) => {
    const value = context.dataset.data[context.dataIndex] as number;
    return value < 0 ? 'start' : 'end';
  },
  align: (context: any) => {
    const value = context.dataset.data[context.dataIndex] as number;
    return value < 0 ? 'bottom' : 'top';
  },
  font: {
    ...(baseFont as any),
    size: 10,
  },
  formatter: (value: number) => {
    return value % 1 === 0 ? value.toString() : value.toFixed(1);
  },
});

export const getSharedTitleConfig = (yAxis = true): any => {
  return yAxis
    ? {
        display: false,
      }
    : {
        display: true,
        text: '(Immediately post-treatment)',
        align: 'start',
        color: '#898989', // Text color
        font: { ...baseFont, ...{ style: 'italic' } },
      };
};

export const updateYAxisRange = (
  data: number[],
  chartOptions: ChartConfiguration<'bar'>['options']
) => {
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);

  // As per business requeriment if all values are 0 we should display 0% and 50%
  if (minValue === 0 && maxValue === 0) {
    (chartOptions as any).scales!.y!.min = 0;
    (chartOptions as any).scales!.y!.max = 50;
  } else {
    const roundedMax = Math.ceil(maxValue / 50) * 50;
    const roundedMin = Math.floor(minValue / 50) * 50;
    (chartOptions as any).scales!.y!.min = roundedMin;
    (chartOptions as any).scales!.y!.max = roundedMax;
  }
};

export const getBasicChartOptions =
  (): ChartConfiguration<'bar'>['options'] => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { ...getChartPaddingConfiguration() },
    },
    plugins: {
      tooltip: {
        enabled: false,
      },
      datalabels: { ...getSharedDataLabelsConfig() },
    },
    scales: {
      y: {
        ticks: { ...getSharedTicksConfig() },
        title: { ...getSharedTitleConfig() },
        grid: { ...getSharedGridConfig() },
      },
      x: {
        grid: { ...getSharedGridConfig(false) },
        ticks: { ...getSharedTicksConfig(false) },
        title: { ...getSharedTitleConfig(false) },
      },
    },
  });

// Adding extra info to set the key and use that on the tooltip
export interface CustomChartDataset extends ChartDataset<'bar', number[]> {
  extraInfo?: string;
  usageType?: string;
}

export function getGroupedAttainment(features: FeatureCollection[]) {
  const groupedAttainment: { [key: string]: number[] } = {};

  features.forEach((feature) => {
    const attainment = feature.properties?.attainment;
    if (attainment && typeof attainment === 'object') {
      for (const [key, value] of Object.entries(attainment)) {
        if (!groupedAttainment[key]) {
          groupedAttainment[key] = [];
        }
        const _value = Number(value);
        // Preventing "NaN"
        if (_value || value === 0) {
          groupedAttainment[key].push(convertTo2DecimalsNumbers(_value));
        }
      }
    }
  });
  return groupedAttainment;
}

function lookupUsageTypeByName(layer: string, usageTypes: UsageType[]): string {
  return (
    usageTypes.find((usage) => usage.datalayer === layer)?.usage_type ?? ''
  );
}

export function sortByTypeAndName(
  a: CustomChartDataset,
  b: CustomChartDataset
): number {
  const typeOrder: String[] = ['PRIORITY', 'SECONDARY_METRIC'];

  // if the type is undefined, score its precedence 1 worse than all other entries
  const aTypeIndex = a.usageType
    ? typeOrder.indexOf(a.usageType)
    : typeOrder.length + 1;
  const bTypeIndex = b.usageType
    ? typeOrder.indexOf(b.usageType)
    : typeOrder.length + 1;
  const aName = a.extraInfo ?? '';
  const bName = b.extraInfo ?? '';

  // Compare the types first
  if (aTypeIndex !== bTypeIndex) {
    return aTypeIndex - bTypeIndex;
  }

  // If types are the same, then compare by name
  return aName.localeCompare(bName);
}

export function getChartDatasetsFromFeatures(
  features: FeatureCollection[],
  usageTypes?: UsageType[]
): CustomChartDataset[] {
  const result: CustomChartDataset[] = [];

  const groupedAttainment = getGroupedAttainment(features);

  Object.keys(groupedAttainment).forEach((key, _) => {
    result.push({
      data: groupedAttainment[key],
      usageType: usageTypes ? lookupUsageTypeByName(key, usageTypes) : '',
      extraInfo: key, // this will be used on the tooltip to set the title
      stack: 'Stack 0',
    });
  });

  return result.sort(sortByTypeAndName);
}

export function convertTo2DecimalsNumbers(value: number): number {
  return Number(value.toFixed(2));
}

export function getProjectAreaLabelsFromFeatures(
  features: FeatureCollection[]
): string[] {
  const result = [];
  for (let i = 0; i < features.length; i++) {
    result.push(String(i + 1));
  }
  // By default we want to display 5 project areas
  return result.length < 5 ? ['1', '2', '3', '4', '5'] : result;
}

export function getDarkGridConfig() {
  return {
    borderColor: 'black',
    tickColor: 'black',
    color: '#898989',
  };
}

export function chartTooltipBaseConfig() {
  return {
    enabled: true,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    titleColor: '#FFF',
    bodyColor: '#FFF',
    borderColor: 'rgba(0, 0, 0, 0.85)',
    borderWidth: 1,
    titleFont: {
      ...getChartFontConfig(),
      size: 12,
      weight: '600',
    },
    bodyFont: {
      ...getChartFontConfig(),
      size: 12,
      weight: '400',
    },
    padding: {
      top: 8,
      bottom: 8,
      left: 12,
      right: 12,
    },
    displayColors: false,
    animation: {
      duration: 0,
    },
  };
}
