export interface DataSet {
  id: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: number;
  organization: { id: number; name: string };
  name: string;
  description: string | null;
  visibility: string;
  version: string;
}

// generated
// data-items.interfaces.ts
export interface Organization {
  id: number;
  name: string;
}

export interface Dataset {
  id: number;
  name: string;
}

export interface InfoStats {
  max: number;
  min: number;
  std: number;
  mean: number;
}

export interface Info {
  crs: string;
  res: number[];
  count: number;
  dtype: string;
  shape: number[];
  stats: InfoStats[];
  tiled: boolean;
  units: Array<string | null>;
  width: number;
  bounds: number[];
  driver: string;
  height: number;
  lnglat: number[];
  nodata: number;
  indexes: number[];
  checksum: number[];
  compress: string;
  transform: number[];
  blockxsize: number;
  blockysize: number;
  interleave: string;
  mask_flags: string[][];
  colorinterp: string[];
  descriptions: Array<string | null>;
}

export interface Geometry {
  type: string;
  coordinates: number[][][];
}

export interface DataItem {
  id: number;
  organization: Organization;
  dataset: Dataset;
  path: string[]; // Array of category names describing the tree path
  name: string;
  type: string;
  geometry_type: string;
  status: string;
  info: Info;
  metadata: any;
  styles: any[];
  geometry: Geometry;
}

/**
 * A tree node that can either be a "category" node (with children)
 * or a "leaf" node representing a single DataItem (via `item`).
 */
export interface TreeNode {
  name: string;
  children?: TreeNode[];
  item?: DataItem; // if defined, this node represents a leaf for that DataItem
}
