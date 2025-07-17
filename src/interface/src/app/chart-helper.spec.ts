import {
  getChartDatasetsFromFeatures,
  convertTo2DecimalsNumbers,
  getProjectAreaLabelsFromFeatures,
} from './chart-helper';

describe('Chart helpers', () => {
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
  });
});
