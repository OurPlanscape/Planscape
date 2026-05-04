import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import {
  ChangeOverTimeChartService,
  ImpactsResultData,
} from './change-over-time-chart.service';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { TreatmentsState } from '../treatments.state';
import { TreatmentsService } from '@services/treatments.service';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { Metric } from '../metrics';

describe('ChangeOverTimeChartService', () => {
  let service: ChangeOverTimeChartService;
  let treatmentsServiceSpy: jasmine.SpyObj<TreatmentsService>;
  let treatmentPlan$: BehaviorSubject<any>;
  let reportMetrics$: BehaviorSubject<
    Record<'blue' | 'purple' | 'orange' | 'green', Metric>
  >;
  let selectedProjectArea$: BehaviorSubject<any>;
  let filteredTreatmentTypes$: BehaviorSubject<any[]>;

  const metrics: Record<'blue' | 'purple' | 'orange' | 'green', Metric> = {
    blue: { id: 'CBD', label: 'Crown Bulk Density' },
    purple: { id: 'CBH', label: 'Canopy Base Height' },
    orange: { id: 'CC', label: 'Canopy Cover' },
    green: { id: 'LARGE_TREE_BIOMASS', label: 'Large Tree Biomass' },
  };

  beforeEach(() => {
    treatmentsServiceSpy = jasmine.createSpyObj<TreatmentsService>(
      'TreatmentsService',
      ['getTreatmentImpactCharts']
    );
    treatmentPlan$ = new BehaviorSubject({ id: 1 } as any);
    reportMetrics$ = new BehaviorSubject(metrics);
    selectedProjectArea$ = new BehaviorSubject('All' as any);
    filteredTreatmentTypes$ = new BehaviorSubject<any[]>([]);

    TestBed.configureTestingModule({
      providers: [
        ChangeOverTimeChartService,
        MockProvider(TreatmentsState, { treatmentPlan$ }),
        MockProvider(DirectImpactsStateService, {
          reportMetrics$,
          selectedProjectArea$,
          filteredTreatmentTypes$,
        }),
        { provide: TreatmentsService, useValue: treatmentsServiceSpy },
      ],
    });

    service = TestBed.inject(ChangeOverTimeChartService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('builds bar chart data grouped and sorted by slot', async () => {
    const resultData: ImpactsResultData[] = [
      {
        year: 2020,
        variable: 'CBD',
        dividend: 0,
        divisor: 0,
        value: 1,
        delta: 0.1,
        relative_year: 10,
      },
      {
        year: 2020,
        variable: 'CBD',
        dividend: 0,
        divisor: 0,
        value: 1,
        delta: 0.2,
        relative_year: 5,
      },
      {
        year: 2020,
        variable: 'CC',
        dividend: 0,
        divisor: 0,
        value: 1,
        delta: 0.05,
        relative_year: 0,
      },
    ];
    treatmentsServiceSpy.getTreatmentImpactCharts.and.returnValue(
      of(resultData)
    );

    const chartData = await firstValueFrom(service.barChartData$);

    expect(chartData!.blue.map((item) => item.year)).toEqual([5, 10]);
    expect(chartData!.blue.map((item) => item.avg_value)).toEqual([20, 10]);
    expect(chartData!.orange.map((item) => item.avg_value)).toEqual([5]);
  });

  it('calls the treatments service with the correct params', async () => {
    const resultData: ImpactsResultData[] = [
      {
        year: 2020,
        variable: 'CBD',
        dividend: 0,
        divisor: 0,
        value: 1,
        delta: 0.1,
        relative_year: 0,
      },
      {
        year: 2020,
        variable: 'CBH',
        dividend: 0,
        divisor: 0,
        value: 1,
        delta: 0.2,
        relative_year: 0,
      },
      {
        year: 2020,
        variable: 'CC',
        dividend: 0,
        divisor: 0,
        value: 1,
        delta: 0.3,
        relative_year: 0,
      },
      {
        year: 2020,
        variable: 'LARGE_TREE_BIOMASS',
        dividend: 0,
        divisor: 0,
        value: 1,
        delta: 0.4,
        relative_year: 0,
      },
    ];
    filteredTreatmentTypes$.next(['Thin' as any]);
    treatmentsServiceSpy.getTreatmentImpactCharts.and.returnValue(
      of(resultData)
    );

    await firstValueFrom(service.barChartData$);

    expect(treatmentsServiceSpy.getTreatmentImpactCharts).toHaveBeenCalledWith(
      1,
      ['CBD', 'CBH', 'CC', 'LARGE_TREE_BIOMASS'],
      null,
      ['Thin' as any]
    );
  });

  it('sets hasChartData$ to false and returns undefined when all values are empty', async () => {
    const resultData: ImpactsResultData[] = [
      {
        year: 2020,
        variable: 'CBD',
        dividend: 0,
        divisor: 0,
        value: 0,
        delta: 0.1,
        relative_year: 0,
      },
    ];
    treatmentsServiceSpy.getTreatmentImpactCharts.and.returnValue(
      of(resultData)
    );

    const chartData = await firstValueFrom(service.barChartData$);
    const hasData = await firstValueFrom(service.hasChartData$);

    expect(chartData).toBeUndefined();
    expect(hasData).toBe(false);
  });

  it('sets hasChartData$ to true when data is present', async () => {
    const resultData: ImpactsResultData[] = [
      {
        year: 2020,
        variable: 'CBD',
        dividend: 0,
        divisor: 0,
        value: 1,
        delta: 0.1,
        relative_year: 0,
      },
    ];
    treatmentsServiceSpy.getTreatmentImpactCharts.and.returnValue(
      of(resultData)
    );

    await firstValueFrom(service.barChartData$);
    const hasData = await firstValueFrom(service.hasChartData$);

    expect(hasData).toBe(true);
  });

  it('sets loading$ to false after data arrives', async () => {
    const resultData: ImpactsResultData[] = [
      {
        year: 2020,
        variable: 'CBD',
        dividend: 0,
        divisor: 0,
        value: 1,
        delta: 0.1,
        relative_year: 0,
      },
    ];
    treatmentsServiceSpy.getTreatmentImpactCharts.and.returnValue(
      of(resultData)
    );

    await firstValueFrom(service.barChartData$);
    const loading = await firstValueFrom(service.loading$);

    expect(loading).toBe(false);
  });
});
