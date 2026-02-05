import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CumulativeAttainmentChartComponent } from '@app/scenario/cumulative-attainment-chart/cumulative-attainment-chart.component';
import { ScenarioResult } from '@types';
import { TooltipItem, TooltipModel } from 'chart.js';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('CumulativeAttainmentChartComponent', () => {
  let component: CumulativeAttainmentChartComponent;
  let fixture: ComponentFixture<CumulativeAttainmentChartComponent>;

  const mockScenarioResult: ScenarioResult = {
    status: 'PENDING',
    completed_at: '0',
    result: {
      features: [
        {
          properties: {
            area_acres: 10,
            attainment: { X: 10, Y: 5 },
          },
        },
        {
          properties: {
            area_acres: 20,
            attainment: { X: 20, Y: 10 },
          },
        },
      ] as any,
      type: 'polygon',
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CumulativeAttainmentChartComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(CumulativeAttainmentChartComponent);
    component = fixture.componentInstance;
    component.scenarioResult = mockScenarioResult;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should process input data and initialize chart data', () => {
    expect(component.allData.labels.length).toBe(2);
  });

  it('should apply correct colors from colorForLabel()', () => {
    // assuming 'Total Aboveground Carbon' has color '#BBE3B6',

    const color = component.colorForLabel('Total Aboveground Carbon');
    expect(color).toEqual(
      jasmine.objectContaining({
        backgroundColor: '#BBE3B6',
        borderColor: '#BBE3B6',
      })
    );
  });

  it('should configure tooltip to show only dataset label', () => {
    const tooltip = component.options.plugins?.tooltip;

    expect(tooltip).toBeDefined();
    if (!tooltip) return;

    expect(tooltip.enabled).toBeTrue();
    expect(tooltip.displayColors).toBeFalse();

    const mockContext = {
      dataset: { label: 'Test Label' },
    } as TooltipItem<'line'>;

    const labelFn = tooltip.callbacks?.label;
    const fakeThis = {} as TooltipModel<'line'>; // safe enough for test
    const result = labelFn?.call(fakeThis, mockContext);

    expect(result).toBe('Test Label');
  });

  it('should round the labels', () => {
    const original = component.allData.labels;
    expect(original.every((l: number) => Number.isInteger(l))).toBeTrue();
  });
});
