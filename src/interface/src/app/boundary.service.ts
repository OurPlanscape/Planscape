import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class BoundaryService {
  constructor(private http: HttpClient) {}

  getBoundaryShapes() {
    // Get the shapes from the REST server.
    return this.http.get('http://127.0.0.1:8000/api/tcsi_huc12');
  }
}
