import { ChartConfiguration } from 'chart.js';

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

export const getSharedGridConfig = (yAxis = true): any =>
  yAxis
    ? {
        drawBorder: false, // Remove the border along the y-axis
        drawTicks: false,
        lineWidth: 1, // Set line width for dotted lines
        color: '#979797', // Dotted line color
        borderDash: [5, 5], // Define the dash pattern (4px dash, 4px gap)
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
        text: 'Time Steps (Years)',
        align: 'start',
        color: '#898989', // Text color
        font: baseFont,
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
