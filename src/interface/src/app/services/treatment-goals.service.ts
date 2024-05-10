import { Injectable } from '@angular/core';
import { Region, regionToString, TreatmentGoalConfig } from '@types';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TreatmentGoalsService {
  constructor(private http: HttpClient) {}

  getTreatmentGoalsForArea(region: Region) {
    return this.http.get<TreatmentGoalConfig[]>(
      environment.backend_endpoint +
        '/planning/treatment_goals_config/?region_name=' +
        `${regionToString(region)}`
    );
  }
}
