import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';

import { Region } from './types';

/** A map of Region to its corresponding geojson path. */
const regionToGeojsonMap: Record<Region, string> = {
  [Region.SIERRA_NEVADA]: 'assets/geojson/sierra_nevada_region.geojson',
  [Region.CENTRAL_COAST]: '',
  [Region.NORTHERN_CALIFORNIA]: '',
  [Region.SOUTHERN_CALIFORNIA]: '',
}

@Injectable({
  providedIn: 'root',
})
export class MapService {
  constructor(private http: HttpClient) {}

  /**
   * Gets the GeoJSON for the given region, or an empty observable
   * if the path is empty.
   * */
  getRegionBoundary(region: Region): Observable<GeoJSON.GeoJSON> {
    const path = regionToGeojsonMap[region];
    if (!path) return EMPTY;
    return this.http.get<GeoJSON.GeoJSON>(path);
  }

  /**
   * (For reference, currently unused)
   * Gets boundaries for four regions: Sierra Nevada, Southern California,
   * Central Coast, Northern California.
   * */
  getRegionBoundaries(): Observable<GeoJSON.GeoJSON> {
    return this.http.get<GeoJSON.GeoJSON>(
      'http://127.0.0.1:8000/boundary/boundary_details/?boundary_name=task_force_regions'
    );
  }

  getBoundaryShapes(): Observable<GeoJSON.GeoJSON> {
    // Get the shapes from the REST server.
    return this.http.get<GeoJSON.GeoJSON>(
      'http://127.0.0.1:8000/boundary/boundary_details/?boundary_name=tcsi_huc12'
    );
  }

  // Queries the CalMAPPER ArcGIS Web Feature Service for known land management projects without filtering.
  getExistingProjects(): Observable<GeoJSON.GeoJSON> {
    const params = {
      'where': '1=1',
      'outFields' : 'PROJECT_NAME,PROJECT_STATUS',
      'f': 'GEOJSON'
    }

    const url = "https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/ArcGIS/rest/services/CMDash_v3_view/FeatureServer/2/query?" + new URLSearchParams(params).toString();
    console.log(url);
    return this.http.get<GeoJSON.GeoJSON>(url);
  }
}
