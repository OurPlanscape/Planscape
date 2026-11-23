import {
  getChartDatasetsFromFeatures,
  convertTo2DecimalsNumbers,
  getProjectAreaLabelsFromFeatures,
  CustomChartDataset,
  sortByTypeAndName,
  usageTypeLayerName,
} from './chart-helper';
import { DataLayer, UsageType } from '@types';

describe('Chart helpers', () => {
  function layer(id: number, name: string) {
    return { id, name } as DataLayer;
  }

  describe('usageTypeLayerName', () => {
    it('reads the name off the layer the scenario sends', () => {
      const usage = {
        usage_type: 'PRIORITY',
        datalayer: layer(7, 'Fire Severity'),
      } as UsageType;

      expect(usageTypeLayerName(usage)).toBe('Fire Severity');
    });

    it('reads a payload that still sends the name on its own', () => {
      const usage = {
        usage_type: 'PRIORITY',
        datalayer: 'Fire Severity',
      } as UsageType;

      expect(usageTypeLayerName(usage)).toBe('Fire Severity');
    });

    it('reads no name rather than throwing on a layer that is missing', () => {
      const usage = { usage_type: 'PRIORITY' } as unknown as UsageType;

      expect(usageTypeLayerName(usage)).toBe('');
    });
  });

  describe('getChartDatasetsFromFeatures', () => {
    const features = [
      { properties: { attainment: { 'Fire Severity': 1, Carbon: 2 } } },
    ] as any;

    function usageTypeOf(datasets: CustomChartDataset[], metric: string) {
      return datasets.find((d) => d.extraInfo === metric)?.usageType;
    }

    it('tags each metric with the usage type of its layer', () => {
      const datasets = getChartDatasetsFromFeatures(features, [
        {
          usage_type: 'PRIORITY',
          datalayer: layer(7, 'Fire Severity'),
        },
        {
          usage_type: 'SECONDARY_METRIC',
          datalayer: layer(8, 'Carbon'),
        },
      ] as UsageType[]);

      expect(usageTypeOf(datasets, 'Fire Severity')).toBe('PRIORITY');
      expect(usageTypeOf(datasets, 'Carbon')).toBe('SECONDARY_METRIC');
    });

    it('leaves a metric untagged when no layer answers for it', () => {
      const datasets = getChartDatasetsFromFeatures(features, [
        { usage_type: 'PRIORITY', datalayer: layer(9, 'Water') },
      ] as UsageType[]);

      expect(usageTypeOf(datasets, 'Fire Severity')).toBe('');
    });
  });

  describe('convertTo2DecimalsNumbers', () => {
    it('should round a number to 2 decimals', () => {
      expect(convertTo2DecimalsNumbers(3.14159)).toBe(3.14);
      expect(convertTo2DecimalsNumbers(2)).toBe(2.0);
      expect(convertTo2DecimalsNumbers(2.555)).toBe(2.56);
    });
  });

  describe('getProjectAreaLabelsFromFeatures', () => {
    it('should return ["1", "2", "3", "4", "5"] if less than 5 features', () => {
      const features = [{}, {}, {}]; // 3 features
      const labels = getProjectAreaLabelsFromFeatures(features as any);
      expect(labels).toEqual(['1', '2', '3', '4', '5']);
    });

    it('should return correct labels if 5 or more features', () => {
      const features = [{}, {}, {}, {}, {}]; // 5 features
      const labels = getProjectAreaLabelsFromFeatures(features as any);
      expect(labels).toEqual(['1', '2', '3', '4', '5']);
    });

    it('should return correct labels if more than 5 features', () => {
      const features = [{}, {}, {}, {}, {}, {}, {}]; // 7 features
      const labels = getProjectAreaLabelsFromFeatures(features as any);
      expect(labels).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    });
  });

  describe('sortByTypeAndName', () => {
    it('should sort chartdatasets by type if it exists, then by name', () => {
      const exampleDataset: CustomChartDataset[] = [
        {
          data: [1, 2, 3],
          extraInfo: 'ZZZ NO USAGE TYPE',
          stack: 'Stack 0',
        },
        {
          data: [1, 2, 3],
          extraInfo: 'ZZZ SECONDARY',
          usageType: 'SECONDARY_METRIC',
          stack: 'Stack 0',
        },
        {
          data: [1, 2, 3],
          extraInfo: 'BBB SECONDARY',
          usageType: 'SECONDARY_METRIC',
          stack: 'Stack 0',
        },
        {
          data: [1, 2, 3],
          extraInfo: 'CCC SECONDARY',
          usageType: 'SECONDARY_METRIC',
          stack: 'Stack 0',
        },
        {
          data: [1, 2, 3],
          extraInfo: 'AAA NO USAGE TYPE',
          stack: 'Stack 0',
        },
        {
          data: [1, 2, 3],
          extraInfo: 'AAA SECONDARY',
          usageType: 'SECONDARY_METRIC',
          stack: 'Stack 0',
        },
        {
          data: [1, 2, 3],
          usageType: 'PRIMARY',
          extraInfo: 'ZZ PRIMARY',
          stack: 'Stack 0',
        },
        {
          data: [1, 2, 3],
          usageType: 'PRIMARY',
          extraInfo: 'AA PRIMARY',
          stack: 'Stack 0',
        },
      ];

      const sortedExample = exampleDataset.sort(sortByTypeAndName);
      expect(sortedExample.map((attainment) => attainment.extraInfo)).toEqual([
        'AA PRIMARY',
        'ZZ PRIMARY',
        'AAA SECONDARY',
        'BBB SECONDARY',
        'CCC SECONDARY',
        'ZZZ SECONDARY',
        'AAA NO USAGE TYPE',
        'ZZZ NO USAGE TYPE',
      ]);
    });
  });

  describe('getChartDatasetsFromFeatures', () => {
    it('should group attainment properties into datasets', () => {
      const features = [
        { properties: { attainment: { a: 1.2345, b: 2.3456 } } },
        { properties: { attainment: { a: 3.4567, b: 4.5678 } } },
      ] as any;

      const datasets = getChartDatasetsFromFeatures(features);

      expect(datasets.length).toBe(2);
      expect(datasets[0].data).toEqual([1.23, 3.46]);
      expect(datasets[1].data).toEqual([2.35, 4.57]);

      expect(datasets[0].stack).toBe('Stack 0');
      expect(datasets[1].stack).toBe('Stack 0');
    });

    it('should handle empty features', () => {
      const datasets = getChartDatasetsFromFeatures([]);
      expect(datasets).toEqual([]);
    });

    it('Should handle 0 values as expected', () => {
      const features = [
        { properties: { attainment: { a: 12, b: 0 } } },
        { properties: { attainment: { a: 0, b: 14 } } },
      ] as any;

      const datasets = getChartDatasetsFromFeatures(features);

      expect(datasets.length).toBe(2);
      expect(datasets[0].data).toEqual([12, 0]);
      expect(datasets[1].data).toEqual([0, 14]);

      expect(datasets[0].stack).toBe('Stack 0');
      expect(datasets[1].stack).toBe('Stack 0');
    });
  });
});
