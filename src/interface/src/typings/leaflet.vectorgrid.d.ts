import * as L from "leaflet";

declare module "leaflet" {
  namespace vectorGrid {
      export function slicer(data: any, options?: any): L.Layer;
      export function protobuf(data: string, VectorTileOptions?: any): L.Layer;
      export function  setFeatureStyle(id: Number, layerStyle: L.PathOptions): any;
      export function resetFeatureStyle(id: Number): any;
  }
}

export interface VectorTileOptions {
      rendererFactory?: L.RendererOptions;
      interactive?: boolean;
      getFeatureId? (f: any): string|boolean;
      attribution?: string;
      vectorTileLayerStyles?: VTLStyleOptions;
      subdomains?: string;
      key?: string;
      maxNativeZoom?: number;
      token?: string;
   }
  export interface VTLStyleOptions {
      [index: string]: any;
  }