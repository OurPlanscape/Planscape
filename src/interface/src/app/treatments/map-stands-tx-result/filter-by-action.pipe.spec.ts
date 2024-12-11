import { FilterByActionPipe } from './filter-by-action.pipe';
import type { FilterSpecification } from 'maplibre-gl';

describe('FilterByActionPipe', () => {
  let pipe: FilterByActionPipe;

  beforeEach(() => {
    pipe = new FilterByActionPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return undefined when treatments is null', () => {
    const result = pipe.transform(null);
    expect(result).toBeUndefined();
  });

  it('should return undefined when treatments is an empty array', () => {
    const result = pipe.transform([]);
    expect(result).toBeUndefined();
  });

  it('should return a filter specification for a non-empty array', () => {
    const treatments = ['ACTION_1', 'ACTION_2'];
    const result = pipe.transform(treatments) as FilterSpecification;

    expect(JSON.stringify(result)).toBe(
      JSON.stringify(['in', 'action', 'ACTION_1', 'ACTION_2'])
    );
  });

  it('should handle a single treatment value', () => {
    const treatments = ['ACTION_1'];
    const result = pipe.transform(treatments) as FilterSpecification;
    expect(JSON.stringify(result)).toBe(
      JSON.stringify(['in', 'action', 'ACTION_1'])
    );
  });

  it('should not mutate the input array', () => {
    const treatments = ['ACTION_1', 'ACTION_2'];
    const originalTreatments = [...treatments];
    pipe.transform(treatments);

    expect(treatments).toEqual(originalTreatments);
  });
});
