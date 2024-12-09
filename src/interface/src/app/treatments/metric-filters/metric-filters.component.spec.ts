import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetricFiltersComponent } from './metric-filters.component';
import { DEFAULT_SLOT, Metric, METRICS } from '../metrics';
import { MockProvider, MockProviders } from 'ng-mocks';
import { BehaviorSubject } from 'rxjs';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { TreatmentsState } from '../treatments.state';
import { PRESCRIPTIONS } from '../prescriptions';

export const MockMetrics = [
  {
    id: 'ID_1',
    color: '',
    label: 'Mock metric 1',
  },
  {
    id: 'ID_2',
    color: '',
    label: 'Mock metric 2',
  },
  {
    id: 'ID_3',
    color: '',
    label: 'Mock metric 2',
  },
  {
    id: 'ID_4',
    color: '',
    label: 'Mock metric 4',
  },
  {
    id: 'ID_5',
    color: '',
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
          activeMetric$: new BehaviorSubject({
            metric: METRICS[0],
            slot: DEFAULT_SLOT,
          }),
        }),
        MockProviders(TreatmentsState),
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
    const metric: Metric = { id: 'Test', label: '' };
    component.optionSelected(dropdownIndex, 'blue', metric);
    // The selected option for this dropdown should be updated with the corresponding ID
    expect(component.selectedOptions[dropdownIndex]).toEqual(metric.id);
    // updateDropdownOptions should be called with the dropdown index we just selected
    expect(component.updateDropdownOptions).toHaveBeenCalledWith(dropdownIndex);
  });

  it('should return an empty array when selection is empty', () => {
    const result = component.processTreatmentTypeSelection([]);
    expect(result).toEqual([]);
  });

  it('should map single treatment options correctly', () => {
    const selection = [
      PRESCRIPTIONS.SINGLE.HEAVY_MASTICATION,
      PRESCRIPTIONS.SINGLE.HEAVY_THINNING_BIOMASS,
    ];
    const result = component.processTreatmentTypeSelection(selection);
    expect(result).toEqual(['HEAVY_MASTICATION', 'HEAVY_THINNING_BIOMASS']);
  });

  it('should map sequence treatment options correctly', () => {
    const selection = [
      PRESCRIPTIONS.SEQUENCE.HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE.details[0],
    ];
    const result = component.processTreatmentTypeSelection(selection);
    expect(result).toEqual(['HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE']);
  });

  it('should map mixed treatment options correctly', () => {
    const selection = [
      PRESCRIPTIONS.SINGLE.HEAVY_MASTICATION,
      PRESCRIPTIONS.SEQUENCE.HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE.details[0],
    ];
    const result = component.processTreatmentTypeSelection(selection);
    expect(result).toEqual([
      'HEAVY_MASTICATION',
      'HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE',
    ]);
  });
});
