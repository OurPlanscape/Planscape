import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { TreatmentPlan } from '@types';

interface ProjectArea {
  project_area_id: number;
  project_area_name: string;
  total_stand_count: number;
  prescriptions: [];
}

export interface Summary {
  project_areas: ProjectArea[];
}

@Injectable({
  providedIn: 'root',
})
export class TreatmentsService {
  readonly baseUrl = environment.backend_endpoint + '/v2/treatment_plans/';

  constructor(private http: HttpClient) {}

  createTreatmentPlan(scenarioId: number, name: string) {
    return this.http.post<TreatmentPlan>(
      this.baseUrl,
      { scenario: scenarioId, name: name },
      {
        withCredentials: true,
      }
    );
  }

  listTreatmentPlans(scenarioId: number) {
    return this.http.get<TreatmentPlan[]>(this.baseUrl, {
      withCredentials: true,
      params: {
        scenario: scenarioId,
      },
    });
  }

  deleteTreatmentPlan(id: number) {
    return this.http.delete<TreatmentPlan>(this.baseUrl + id, {
      withCredentials: true,
    });
  }

  duplicateTreatmentPlan(id: number) {
    return this.http.post<TreatmentPlan>(this.baseUrl + id + '/clone/', {
      withCredentials: true,
    });
  }

  getTreatmentPlan(id: number) {
    return this.http.get<TreatmentPlan>(this.baseUrl + id, {
      withCredentials: true,
    });
  }

  getTreatmentPlanSummary(id: number) {
    return this.http.get<Summary>(this.baseUrl + id + '/summary', {
      withCredentials: true,
    });
  }
}
