import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StandDataChartComponent } from './stand-data-chart.component';
import { Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

describe('StandDataChartComponent', () => {
  let component: StandDataChartComponent;
  let fixture: ComponentFixture<StandDataChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StandDataChartComponent],
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
