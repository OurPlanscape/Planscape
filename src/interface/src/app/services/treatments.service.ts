import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { TreatmentPlan } from '@types';

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
}
