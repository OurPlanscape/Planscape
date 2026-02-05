import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import {
  ChangeOverTimeChartComponent,
  ImpactsResultData,
} from '@app/treatments/change-over-time-chart/change-over-time-chart.component';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TreatmentsState } from '@app/treatments/treatments.state';
import { TreatmentsService } from '@services/treatments.service';
import { DirectImpactsStateService } from '@app/treatments/direct-impacts.state.service';
import { Metric } from '@app/treatments/metrics';

describe('ChangeOverTimeChartComponent', () => {
  let component: ChangeOverTimeChartComponent;
  let fixture: ComponentFixture<ChangeOverTimeChartComponent>;
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

  beforeEach(async () => {
    treatmentsServiceSpy = jasmine.createSpyObj<TreatmentsService>(
      'TreatmentsService',
      ['getTreatmentImpactCharts']
    );
    treatmentPlan$ = new BehaviorSubject({ id: 1 } as any);
    reportMetrics$ = new BehaviorSubject(metrics);
    selectedProjectArea$ = new BehaviorSubject('All' as any);
    filteredTreatmentTypes$ = new BehaviorSubject<any[]>([]);
    await TestBed.configureTestingModule({
      imports: [ChangeOverTimeChartComponent, HttpClientTestingModule],
      providers: [
        MockProvider(TreatmentsState, {
          treatmentPlan$,
        }),
        MockProvider(DirectImpactsStateService, {
          reportMetrics$,
          selectedProjectArea$,
          filteredTreatmentTypes$,
        }),
        { provide: TreatmentsService, useValue: treatmentsServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangeOverTimeChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('converts impact results into chart data grouped and sorted by slot', () => {
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

    const chartData = component.convertImpactResultToChartData(
      resultData,
      metrics
    );

    expect(chartData.blue.map((item) => item.year)).toEqual([5, 10]);
    expect(chartData.blue.map((item) => item.avg_value)).toEqual([20, 10]);
    expect(chartData.orange.map((item) => item.avg_value)).toEqual([5]);
  });

  it('detects empty data when all values are falsy', () => {
    const resultData = [
      { value: 0 },
      { value: null },
      { value: undefined },
    ] as any[];

    expect(component.isDataEmpty(resultData)).toBe(true);
  });

  it('returns undefined chart configuration when empty data is flagged', () => {
    component.emptyData = true;

    expect(component.chartConfiguration({} as any)).toBeUndefined();
  });

  it('builds bar chart data and calls the treatments service with filters', async () => {
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

    const chartData = await firstValueFrom(component.barChartData$);

    expect(treatmentsServiceSpy.getTreatmentImpactCharts).toHaveBeenCalledWith(
      1,
      ['CBD', 'CBH', 'CC', 'LARGE_TREE_BIOMASS'],
      null,
      ['Thin' as any]
    );
    expect(chartData?.datasets?.[0].data).toEqual([10]);
    expect(chartData?.datasets?.[1].data).toEqual([20]);
    expect(chartData?.datasets?.[2].data).toEqual([30]);
    expect(chartData?.datasets?.[3].data).toEqual([40]);
  });

  it('marks empty data and returns undefined chart data when values are empty', async () => {
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

    const chartData = await firstValueFrom(component.barChartData$);

    expect(component.emptyData).toBe(true);
    expect(chartData).toBeUndefined();
  });
});
