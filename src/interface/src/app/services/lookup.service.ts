import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class LookupService {
  readonly baseUrl = environment.backend_endpoint + '/v2/lookups/';

  constructor(private http: HttpClient) {}

  getPrescriptions() {
    return this.http.get<{
      SINGLE: Record<string, string>;
      SEQUENCE: Record<string, string>;
    }>(this.baseUrl + 'treatment_prescription_action/', {
      withCredentials: true,
    });
  }
}
