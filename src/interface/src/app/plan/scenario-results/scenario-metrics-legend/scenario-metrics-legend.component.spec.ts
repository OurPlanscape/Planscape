import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioMetricsLegendComponent } from './scenario-metrics-legend.component';

describe('ScenarioMetricsLegendComponent', () => {
  let component: ScenarioMetricsLegendComponent;
  let fixture: ComponentFixture<ScenarioMetricsLegendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioMetricsLegendComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioMetricsLegendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
