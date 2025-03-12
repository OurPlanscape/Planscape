import {
  DataLayerSearchResult,
  DataSetSearchResult,
  IdNamePair,
  SearchResult,
} from '@types';

export interface Results {
  dataSets: DataSetSearchResult[];
  groupedLayers: GroupedResults;
}

export interface Category {
  path: string[];
  layers: SearchResult[];
}

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

export function groupSearchResults(results: SearchResult[]): Results {
  // Separate Datasets & DataLayers
  const dataSets = results.filter(isDataSetSearchResult);
  const dataLayers = results.filter(isDataLayerSearchResult);

  // Group results by dataset first, and then categories
  const grouped = dataLayers.reduce((acc, value) => {
    const org = value.data.organization;
    const dataset = value.data.dataset;
    const pathArr = value.data.path || [];
    const pathKey = pathArr.join(' - ');
    const dataSetPath = dataset.id + '-' + dataset.name;

    // if no org create one
    if (!acc[dataSetPath]) {
      acc[dataSetPath] = {
        org: org,
        dataset: dataset,
        categories: {},
      };
    }
    // if no category create one
    if (!acc[dataSetPath].categories[pathKey]) {
      acc[dataSetPath].categories[pathKey] = {
        path: pathArr,
        layers: [],
      };
    }
    // finally, push the layer
    acc[dataSetPath].categories[pathKey].layers.push(value);
    return acc;
  }, {} as GroupedResults);

  // return datasets and grouped results
  return { dataSets, groupedLayers: grouped };
}

function isDataSetSearchResult(r: SearchResult): r is DataSetSearchResult {
  return r.type === 'DATASET';
}

function isDataLayerSearchResult(r: SearchResult): r is DataLayerSearchResult {
  return r.type === 'DATALAYER';
}
