import { BehaviorSubject, combineLatest, map, of } from 'rxjs';
import {
  DEFAULT_SLOT,
  ImpactsMetric,
  ImpactsMetricSlot,
  METRICS,
} from './metrics';
import { MapGeoJSONFeature } from 'maplibre-gl';
import { ImpactsProjectArea } from './direct-impacts/direct-impacts.component';
import { PrescriptionAction } from './prescriptions';
import { TreatmentsService } from '@services/treatments.service';
import { Injectable } from '@angular/core';
import { TreatmentPlan } from '../types';

export interface ImpactsResultData {
  year: number;
  variable: string;
  dividend: number;
  divisor: number;
  value: number;
  delta: number;
  relative_year: number;
}

export interface ChangeOverTimeChartItem {
  variable: string;
  year: number;
  avg_value: number;
}

@Injectable()
export class DirectImpactsStateService {
  public _activeMetric$ = new BehaviorSubject<ImpactsMetric>({
    metric: METRICS[0],
    slot: DEFAULT_SLOT,
  });

  public activeMetric$ = this._activeMetric$.asObservable();

  //TODO: make this async? a behavior subject?
  private selectedMetrics: string[] = [];

  private _filteredTreatmentTypes$ = new BehaviorSubject<PrescriptionAction[]>(
    []
  );
  public filteredTreatmentTypes$ = this._filteredTreatmentTypes$.asObservable();
  private _activeStand$ = new BehaviorSubject<MapGeoJSONFeature | null>(null);
  public activeStand$ = this._activeStand$.asObservable();

  private _activeTreatmentPlan$ = new BehaviorSubject<TreatmentPlan | null>(
    null
  );
  public activeTreatmentPlan$ = this._activeTreatmentPlan$.asObservable();

  private _selectedProjectAreaForChanges$ =
    new BehaviorSubject<ImpactsProjectArea | null>(null);
  public selectedProjectAreaForChanges$ =
    this._selectedProjectAreaForChanges$.asObservable();

  private _changeOverTimeData$ = new BehaviorSubject<
    ChangeOverTimeChartItem[][]
  >([[]]);
  public changeOverTimeData$ = this._changeOverTimeData$.asObservable();

  // todo: placeholder to fill once we have project area filter
  projectArea$ = of('All Project Areas');

  private _showTreatmentPrescription$ = new BehaviorSubject(false);
  public showTreatmentPrescription$ =
    this._showTreatmentPrescription$.asObservable();

  mapPanelTitle$ = combineLatest([
    this.activeMetric$,
    this.projectArea$,
    this.showTreatmentPrescription$,
  ]).pipe(
    map(([activeMetric, pa, showTreatment]) =>
      showTreatment
        ? 'Applied Treatment Prescription'
        : `${activeMetric.metric.label} for ${pa}`
    )
  );

  constructor(private treatmentsService: TreatmentsService) {
    this._changeOverTimeData$.next([[]]);
  }

  convertImpactResultToChartData(
    data: ImpactsResultData[]
  ): ChangeOverTimeChartItem[][] {
    const chartData = data
      .map((d) => {
        return {
          year: d.relative_year,
          avg_value: d.delta * 100,
          variable: d.variable,
        };
      })
      .sort((a, b) => a.year - b.year);
    // Collect unique variables
    const metricsVars = [...new Set(chartData.map((item) => item.variable))];
    // Create arrays for each unique variable
    const converted = metricsVars.map((v) =>
      chartData.filter((item) => item.variable === v)
    );
    return converted;
  }

  getChangesOverTimeData() {
    const treatmentPlanId = this._activeTreatmentPlan$.value?.id;
    if (!treatmentPlanId) {
      return;
    }
    const projId = this._selectedProjectAreaForChanges$.value?.project_area_id;
    this.treatmentsService
      .getTreatmentImpactCharts(
        treatmentPlanId,
        this.selectedMetrics,
        projId ?? null
      )
      .subscribe({
        next: (response: any) => {
          const chartData = this.convertImpactResultToChartData(
            response as ImpactsResultData[]
          );
          this._changeOverTimeData$.next(chartData);
        },
        error: (error) => {
          //TODO: replace with snackbar or similar
        },
      });
  }

  setSelectedMetrics(selections: string[]) {
    //TODO: make this a behavior subject??
    this.selectedMetrics = selections;
  }

  setProjectAreaForChanges(projectArea: ImpactsProjectArea | null) {
    this._selectedProjectAreaForChanges$.next(projectArea);

    //then refresh the changes chart data
    this.getChangesOverTimeData();
  }

  setActiveStand(standData: MapGeoJSONFeature) {
    this._activeStand$.next(standData);
  }

  setActiveTreatmentPlan(treatmentPlan: TreatmentPlan) {
    this._activeTreatmentPlan$.next(treatmentPlan);
  }

  setFilteredTreatmentTypes(selection: PrescriptionAction[]) {
    this._filteredTreatmentTypes$.next(selection);
  }

  setActiveMetric(mapMetric: ImpactsMetric) {
    this._activeMetric$.next(mapMetric);
  }

  isActiveSlot(slot: ImpactsMetricSlot) {
    return this._activeMetric$.value.slot === slot;
  }

  setShowTreatmentPrescription(show: boolean) {
    this._showTreatmentPrescription$.next(show);
  }
}
