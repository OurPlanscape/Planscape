import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Summary, TreatmentPlan } from '@types';

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

  getTreatmentPlan(id: number) {
    return this.http.get<TreatmentPlan>(this.baseUrl + id, {
      withCredentials: true,
    });
  }

  getTreatmentPlanSummary(id: number, projectArea?: number) {
    return this.http.get<Summary>(this.baseUrl + id + '/summary', {
      withCredentials: true,
      params:
        projectArea !== undefined ? { project_area: projectArea } : undefined,
    });
  }

  setTreatments(
    treatmentPlanId: number,
    projectAreaId: number,
    action: string,
    standIds: number[]
  ) {
    return this.http.post(
      this.baseUrl + treatmentPlanId + '/treatment_prescriptions/',
      {
        project_area: projectAreaId,
        action: action,
        stands: standIds,
        treatment_plan: treatmentPlanId,
      },
      {
        withCredentials: true,
      }
    );
  }
}
