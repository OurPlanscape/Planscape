import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  constructor(private http: HttpClient) {}

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
    return this.http.get<GeoJSON.GeoJSON>(url);
  }
}
