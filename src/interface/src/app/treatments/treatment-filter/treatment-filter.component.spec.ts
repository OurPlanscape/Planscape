import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentFilterComponent } from './treatment-filter.component';
import { TreatmentsState } from '../treatments.state';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject, of } from 'rxjs';

describe('TreatmentFilterComponent', () => {
  let component: TreatmentFilterComponent;
  let fixture: ComponentFixture<TreatmentFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentFilterComponent],
      providers: [
        MockProvider(TreatmentsState, {
          treatmentTypeOptions$: new BehaviorSubject([]),
        }),
        MockProvider(DirectImpactsStateService, {
          filteredTreatmentTypes$: new BehaviorSubject([]),
          activeStand$: new BehaviorSubject(null),
          selectedProjectArea$: of('All' as any),
          reportMetrics$: of(null as any),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
