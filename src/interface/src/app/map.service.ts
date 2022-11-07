import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  constructor(private http: HttpClient) {}

  /**
   * Gets boundaries for four regions: Sierra Nevada, Southern California,
   * Central Coast, Northern California. (For reference, currently unused)
   * */
  getRegionBoundary(): Observable<GeoJSON.GeoJSON> {
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
