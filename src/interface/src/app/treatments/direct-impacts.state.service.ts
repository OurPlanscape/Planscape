import { BehaviorSubject } from 'rxjs';
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

  constructor(private treatmentsService: TreatmentsService) {
    this._changeOverTimeData$.next([]);
  }

  //TODO ensure this returns the ChangeOverTimeChartItem
  convertImpactResultToChartData(data: ImpactsResultData[]): any[][] {
    //TODO: convert data to year, avg_value data...
    // for year, count from initial year
    //  average value??
    const currentYear = 2024;
    const chartData = data
      .map((d) => {
        return {
          year: d.year - currentYear,
          avg_value: d.value, //idk....
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
    //TODO: send selectedProjectArea and active Metrics to backend,
    // then collect chart data (and ensure it's sorted by year) to a state variable here

    //TODO: are these selections in a state somewher ealready?
    //TODO: remove this hardcoded example
    const testMetrics = this.selectedMetrics;

    const treatmentPlanId = this._activeTreatmentPlan$.value!.id;

    this.treatmentsService
      .getTreatmentImpactCharts(treatmentPlanId, testMetrics)
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
    //TODO: make this a behavior subject
    this.selectedMetrics = selections;
  }

  setProjectAreaForChanges(projectArea: ImpactsProjectArea) {
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
}
