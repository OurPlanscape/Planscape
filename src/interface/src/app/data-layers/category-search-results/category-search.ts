import {
  DataLayerSearchResult,
  DataSetSearchResult,
  SearchResult,
  SimpleCategory,
  SimpleCategorySearchResult,
} from '@types';

export interface CategoryGroup {
  // null holds the layers without a simple category
  category: SimpleCategory | null;
  layers: DataLayerSearchResult[];
}

export interface CategoryResults {
  categories: SimpleCategorySearchResult[];
  dataSets: DataSetSearchResult[];
  groupedLayers: CategoryGroup[];
}

/**
 * Groups layer results under each simple category they belong to, like the
 * category browse list, so a layer in two categories shows up in both.
 */
export function groupSearchResultsByCategory(
  results: SearchResult[]
): CategoryResults {
  const categories = results.filter(
    (r): r is SimpleCategorySearchResult => r.type === 'SIMPLE_CATEGORY'
  );
  const dataSets = results.filter(
    (r): r is DataSetSearchResult => r.type === 'DATASET'
  );
  const groups = new Map<number | null, CategoryGroup>();

  results
    .filter((r): r is DataLayerSearchResult => r.type === 'DATALAYER')
    .forEach((layer) => {
      const layerCategories = layer.data.simple_categories ?? [];
      const targets = layerCategories.length ? layerCategories : [null];
      targets.forEach((category) => {
        const key = category?.id ?? null;
        if (!groups.has(key)) {
          groups.set(key, { category, layers: [] });
        }
        groups.get(key)!.layers.push(layer);
      });
    });

  // uncategorized layers go last
  const groupedLayers = [...groups.values()].sort(
    (a, b) => Number(!a.category) - Number(!b.category)
  );

  return { categories, dataSets, groupedLayers };
}
