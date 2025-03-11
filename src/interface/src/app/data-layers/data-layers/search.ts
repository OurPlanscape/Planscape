import { DataLayer, DataSetSearchResult, IdNamePair } from '@types';

export interface Results {
  dataSets: DataSetSearchResult[];
  groupedLayers: GroupedResults;
}

export interface Category {
  path: string[];
  layers: DataSetSearchResult[];
}

/**
 * A single grouping structure for DATALAYERs,
 * keyed by a path-based string. Each group
 * also stores the actual path array for reference
 */
export interface GroupedResults {
  [groupName: string]: GroupedDataLayers;
}

export interface GroupedDataLayers {
  org: IdNamePair;
  dataset: IdNamePair;
  categories: {
    [pathKey: string]: Category;
  };
}

export function groupSearchResults(results: DataSetSearchResult[]) {
  // Separate Datasets & DataLayers
  const dataSets = results.filter((r) => r.type === 'DATASET');
  const dataLayers = results.filter((r) => r.type === 'DATALAYER');

  // Group results by org first, and then categories
  const grouped = dataLayers.reduce((acc, value) => {
    const org = value.data.organization;
    const pathArr = (value.data as DataLayer).path || [];
    const pathKey = pathArr.join(' - ');
    const orgPath = org.id + '-' + org.name;

    // if no org create one
    if (!acc[orgPath]) {
      acc[orgPath] = {
        org: org,
        dataset: (value.data as DataLayer).dataset,
        categories: {},
      };
    }
    // if no category create one
    if (!acc[orgPath].categories[pathKey]) {
      acc[orgPath].categories[pathKey] = {
        path: pathArr,
        layers: [],
      };
    }
    // finally, push the layer
    acc[orgPath].categories[pathKey].layers.push(value);
    return acc;
  }, {} as GroupedResults);

  // return datasets and grouped results
  return { dataSets, groupedLayers: grouped };
}
