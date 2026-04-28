import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  switchMap,
} from 'rxjs';
import { TreatmentPlan } from '@types';
import { TreatmentsState } from '../treatments.state';
import { TreatmentsService } from '@services/treatments.service';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { ImpactsMetricSlot, Metric } from '../metrics';
import deepEqual from 'fast-deep-equal';

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
export class ChangeOverTimeChartService {
  constructor(
    private stateService: DirectImpactsStateService,
    private treatmentsState: TreatmentsState,
    private treatmentsService: TreatmentsService
  ) {}

  private _hasChartData$ = new BehaviorSubject<boolean | null>(null);
  public hasChartData$ = this._hasChartData$.asObservable();

  private _loading$ = new BehaviorSubject<boolean>(false);
  public loading$ = this._loading$.asObservable();

  barChartData$ = combineLatest([
    this.treatmentsState.treatmentPlan$.pipe(
      filter((plan): plan is TreatmentPlan => !!plan)
    ),
    this.stateService.reportMetrics$.pipe(
      distinctUntilChanged((prev, curr) => deepEqual(prev, curr))
    ),
    this.stateService.selectedProjectArea$,
    this.stateService.filteredTreatmentTypes$,
  ]).pipe(
    switchMap(([plan, metrics, area, txTypes]) => {
      const metricsArray = Object.values(metrics).map((m) => m.id);
      const selectedArea = area !== 'All' ? area.project_area_id : null;
      this._loading$.next(true);

      return this.treatmentsService
        .getTreatmentImpactCharts(plan.id, metricsArray, selectedArea, txTypes)
        .pipe(map((responseData) => ({ response: responseData, metrics })));
    }),
    map(({ response, metrics }) => {
      const resultData = response as ImpactsResultData[];
      const isEmpty = resultData.every((e) => !e.value);
      this._hasChartData$.next(!isEmpty);
      this._loading$.next(false);
      if (isEmpty) return undefined;
      return this.convertToChartData(resultData, metrics);
    })
  );

  private convertToChartData(
    resultData: ImpactsResultData[],
    metrics: Record<ImpactsMetricSlot, Metric>
  ): Record<ImpactsMetricSlot, ChangeOverTimeChartItem[]> {
    const chartData = resultData.map((d) => ({
      year: d.relative_year,
      avg_value: d.delta * 100,
      variable: d.variable,
    }));
    return {
      blue: chartData
        .filter((item) => item.variable === metrics.blue.id)
        .sort((a, b) => a.year - b.year),
      purple: chartData
        .filter((item) => item.variable === metrics.purple.id)
        .sort((a, b) => a.year - b.year),
      orange: chartData
        .filter((item) => item.variable === metrics.orange.id)
        .sort((a, b) => a.year - b.year),
      green: chartData
        .filter((item) => item.variable === metrics.green.id)
        .sort((a, b) => a.year - b.year),
    };
  }
}
