import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { TreatmentPlan, TreatmentSummary } from '@types';
import { MetricResult } from '../treatments/metrics';
import { PrescriptionAction } from '../treatments/prescriptions';

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
        ordering: '-created_at',
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

  getTreatmentImpactCharts(
    treatmentPlanId: number,
    metrics: string[],
    projectAreaId: number | null,
    txTypes: PrescriptionAction[]
  ) {
    let variableParams = new HttpParams();
    metrics.forEach((m) => {
      variableParams = variableParams.append('variables', m);
    });
    if (projectAreaId) {
      variableParams = variableParams.append('project_areas', projectAreaId);
    }
    txTypes.forEach((tx) => {
      variableParams = variableParams.append('actions', tx);
    });
    return this.http.get(this.baseUrl + treatmentPlanId + '/plot/', {
      withCredentials: true,
      params: variableParams,
    });
  }

  getStandResult(treatmentPlanId: number, standId: number) {
    return this.http.get<Record<'FL' | 'ROS', MetricResult>[]>(
      `${this.baseUrl}/${treatmentPlanId}/stand-treatment-results/`,
      {
        withCredentials: true,
        params: {
          stand_id: standId,
        },
      }
    );
  }

  downloadTreatment(treatmentPlanId: number) {
    return this.http.get(`${this.baseUrl}/${treatmentPlanId}/download/`, {
      withCredentials: true,
      responseType: 'blob',
    });
  }
}
