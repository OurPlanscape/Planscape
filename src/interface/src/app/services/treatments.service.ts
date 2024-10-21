import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { TreatmentPlan, TreatmentSummary } from '@types';

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

  updateTreatmentPlan(id: number, changedFields: Partial<TreatmentPlan>) {
    return this.http.patch<TreatmentPlan>(this.baseUrl + id, changedFields, {
      withCredentials: true,
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

  getTreatmentPlanSummary(id: number, projectArea?: number) {
    return this.http.get<TreatmentSummary>(this.baseUrl + id + '/summary', {
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

  removeTreatments(treatmentPlanId: number, standIds: number[]) {
    return this.http.post(
      this.baseUrl +
        treatmentPlanId +
        '/treatment_prescriptions/delete_prescriptions/',
      {
        stand_ids: standIds,
        treatment_plan: treatmentPlanId,
      },
      {
        withCredentials: true,
      }
    );
  }

  runTreatmentPlan(treatmentPlanId: number) {
    return this.http.post(
      this.baseUrl + treatmentPlanId + '/run/',
      {},
      {
        withCredentials: true,
      }
    );
  }
}
