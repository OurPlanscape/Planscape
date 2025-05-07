declare module 'mapbox-gl-arcgis-featureserver' {
  export interface FeatureServiceOptions {
    url: string;
    token?: string;
    params?: Record<string, any>;
  }

  export class FeatureService {
    constructor(
      sourceId: string,
      map: any,
      geojsonSourceOptions: Record<string, any>
    );

    /**
     * Fetches a feature from the Feature Service.
     * @param {string} layerId - The ID of the layer to fetch features from.
     * @param {object} query - Query parameters to filter features.
     * @returns {Promise<any>} - A promise resolving to the features.
     */
    queryFeatures(layerId: string, query: Record<string, any>): Promise<any>;

    /**
     * Gets the layer schema from the Feature Service.
     * @param {string} layerId - The ID of the layer to fetch schema for.
     * @returns {Promise<any>} - A promise resolving to the layer schema.
     */
    getLayerSchema(layerId: string): Promise<any>;

    destroySource(): void;
  }

  export default FeatureService;
}
