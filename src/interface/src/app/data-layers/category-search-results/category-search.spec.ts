import { DataLayer, SearchResult, SimpleCategory } from '@types';
import { groupSearchResultsByCategory } from './category-search';

const fire: SimpleCategory = { id: 1, name: 'Fire', icon: null };
const water: SimpleCategory = { id: 2, name: 'Water', icon: null };

function layer(id: number, categories?: SimpleCategory[]): SearchResult {
  return {
    id,
    name: `Layer ${id}`,
    type: 'DATALAYER',
    url: '',
    data: { id, simple_categories: categories } as DataLayer,
  };
}

describe('groupSearchResultsByCategory', () => {
  it('splits categories, datasets and layers', () => {
    const results = groupSearchResultsByCategory([
      { id: 1, name: 'Fire', type: 'SIMPLE_CATEGORY', url: '', data: fire },
      { id: 9, name: 'DS', type: 'DATASET', url: '', data: {} as any },
      layer(10, [fire]),
    ]);
    expect(results.categories.map((c) => c.id)).toEqual([1]);
    expect(results.dataSets.map((d) => d.id)).toEqual([9]);
    expect(results.groupedLayers.length).toBe(1);
  });

  it('groups layers by category in order of appearance', () => {
    const { groupedLayers } = groupSearchResultsByCategory([
      layer(10, [water]),
      layer(11, [fire]),
      layer(12, [water]),
    ]);
    expect(groupedLayers.map((g) => g.category?.name)).toEqual([
      'Water',
      'Fire',
    ]);
    expect(groupedLayers[0].layers.map((l) => l.id)).toEqual([10, 12]);
  });

  it('lists a layer under every category it belongs to', () => {
    const { groupedLayers } = groupSearchResultsByCategory([
      layer(10, [fire, water]),
    ]);
    expect(groupedLayers.map((g) => g.category?.id)).toEqual([1, 2]);
    groupedLayers.forEach((g) => expect(g.layers[0].id).toBe(10));
  });

  it('puts layers without a category last', () => {
    const { groupedLayers } = groupSearchResultsByCategory([
      layer(10),
      layer(11, []),
      layer(12, [fire]),
    ]);
    expect(groupedLayers.map((g) => g.category)).toEqual([fire, null]);
    expect(groupedLayers[1].layers.map((l) => l.id)).toEqual([10, 11]);
  });
});
