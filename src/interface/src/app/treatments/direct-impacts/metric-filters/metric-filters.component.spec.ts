import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Metric, MetricFiltersComponent } from './metric-filters.component';

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

    spyOn(component, 'applyMetricColor').and.callFake((index, list) => list);
  });

  it('should update the dropdownOption lists', () => {
    const updatedDropdownIndex = null;
    component.updateDropdownOptions(updatedDropdownIndex);

    // Verify applyMetricColor was called 4 times one for every dropdown
    expect(component.applyMetricColor).toHaveBeenCalledTimes(4);
    // The 1st dropdown should have the default option and the not selected one
    expect(component.applyMetricColor).toHaveBeenCalledWith(0, [
      MockMetrics[0],
      MockMetrics[4],
    ]);
    // The 2nd dropdown should have the default option and the not selected one
    expect(component.applyMetricColor).toHaveBeenCalledWith(1, [
      MockMetrics[1],
      MockMetrics[4],
    ]);
    // The 3rd dropdown should have the default option and the not selected one
    expect(component.applyMetricColor).toHaveBeenCalledWith(2, [
      MockMetrics[2],
      MockMetrics[4],
    ]);
    // The 4th dropdown should have the default option and the not selected one
    expect(component.applyMetricColor).toHaveBeenCalledWith(3, [
      MockMetrics[3],
      MockMetrics[4],
    ]);

    // We have 5 items, 4 of them are selected as default, we should have 2 options available per dropdown
    expect(component.dropdownOptions[0].length).toEqual(2);
    expect(component.dropdownOptions[1].length).toEqual(2);
    expect(component.dropdownOptions[2].length).toEqual(2);
    expect(component.dropdownOptions[3].length).toEqual(2);
  });

  it('should update the selected option and call updateDropdownOptions when optionSelected is called', () => {
    spyOn(component, 'updateDropdownOptions').and.callFake(() => {});
    const dropdownIndex = 1;
    const metric: Metric = { id: 'Test', color: '', label: '' };
    component.optionSelected(dropdownIndex, metric);
    // The selected option for this dropdown should be updated with the corresponding ID
    expect(component.selectedOptions[dropdownIndex]).toEqual(metric.id);
    // updateDropdownOptions should be called with the dropdown index we just selected
    expect(component.updateDropdownOptions).toHaveBeenCalledWith(dropdownIndex);
  });
});
