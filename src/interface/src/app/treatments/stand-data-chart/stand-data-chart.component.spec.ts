import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StandDataChartComponent } from './stand-data-chart.component';
import { Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { MockProvider } from 'ng-mocks';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { BehaviorSubject } from 'rxjs';
import { METRICS } from '../metrics';

describe('StandDataChartComponent', () => {
  let component: StandDataChartComponent;
  let fixture: ComponentFixture<StandDataChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StandDataChartComponent],
      providers: [
        MockProvider(DirectImpactsStateService, {
          activeStand$: new BehaviorSubject(null),
          activeMetric$: new BehaviorSubject(METRICS[0]),
        }),
      ],
    }).compileComponents();
    Chart.register(ChartDataLabels);

    fixture = TestBed.createComponent(StandDataChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    Chart.unregister(ChartDataLabels);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
