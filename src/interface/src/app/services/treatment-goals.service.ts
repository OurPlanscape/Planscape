import { Injectable } from '@angular/core';
import { Region, regionToString, TreatmentGoalConfig } from '@types';
import { BackendConstants } from '../backend-constants';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class TreatmentGoalsService {
  constructor(private http: HttpClient) {}

  getTreatmentGoalsForArea(region: Region) {
    return this.http.get<TreatmentGoalConfig[]>(
      BackendConstants.END_POINT +
        '/planning/treatment_goals_config/?region_name=' +
        `${regionToString(region)}`
    );
  }
}
