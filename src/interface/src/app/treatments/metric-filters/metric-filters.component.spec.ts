import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetricFiltersComponent } from './metric-filters.component';
import { Metric, METRICS } from '../metrics';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject } from 'rxjs';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { TreatmentsState } from '../treatments.state';

export const MockMetrics: Metric[] = [
  {
    id: 'FL',
    label: 'Mock metric 1',
  },
  {
    id: 'TOT_FLAME_SEV',
    label: 'Mock metric 2',
  },
  {
    id: 'SDI',
    label: 'Mock metric 2',
  },
  {
    id: 'QMD',
    label: 'Mock metric 4',
  },
  {
    id: 'CBD',
    label: 'Mock metric 5',
  },
];

describe('MetricFiltersComponent', () => {
  let component: MetricFiltersComponent;
  let fixture: ComponentFixture<MetricFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetricFiltersComponent],
      providers: [
        MockProvider(DirectImpactsStateService, {
          activeMetric$: new BehaviorSubject(METRICS[0]),
        }),
        MockProvider(TreatmentsState, {
          summary$: new BehaviorSubject(null),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MetricFiltersComponent);
    component = fixture.componentInstance;
    component.initialOptions = MockMetrics;

    component.selectedOptions = [
      MockMetrics[0].id,
      MockMetrics[1].id,
      MockMetrics[2].id,
      MockMetrics[3].id,
    ];
    component.dropdownOptions = [
      MockMetrics,
      MockMetrics,
      MockMetrics,
      MockMetrics,
    ];
  });

  it('should update the dropdownOption lists', () => {
    const updatedDropdownIndex = null;
    component.updateDropdownOptions(updatedDropdownIndex);

    // We have 5 items, 4 of them are selected as default, we should have 2 options available per dropdown
    expect(component.dropdownOptions[0].length).toEqual(2);
    expect(component.dropdownOptions[1].length).toEqual(2);
    expect(component.dropdownOptions[2].length).toEqual(2);
    expect(component.dropdownOptions[3].length).toEqual(2);
  });

  it('should update the selected option and call updateDropdownOptions when optionSelected is called', () => {
    spyOn(component, 'updateDropdownOptions').and.callFake(() => {});
    const dropdownIndex = 1;
    const metric: Metric = { id: 'POTENTIAL_SMOKE', label: '' };
    component.optionSelected(dropdownIndex, 'blue', metric);
    // The selected option for this dropdown should be updated with the corresponding ID
    expect(component.selectedOptions[dropdownIndex]).toEqual(metric.id);
    // updateDropdownOptions should be called with the dropdown index we just selected
    expect(component.updateDropdownOptions).toHaveBeenCalledWith(dropdownIndex);
  });
});
