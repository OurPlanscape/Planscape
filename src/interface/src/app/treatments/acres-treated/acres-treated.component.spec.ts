import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AcresTreatedComponent } from '@app/treatments/acres-treated/acres-treated.component';
import { MockProvider } from 'ng-mocks';
import { TreatmentsState } from '@app/treatments/treatments.state';
import { MOCK_SUMMARY } from '@app/treatments/mocks';
import { of } from 'rxjs';

describe('AcresTreatedComponent', () => {
  let component: AcresTreatedComponent;
  let fixture: ComponentFixture<AcresTreatedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcresTreatedComponent],
      providers: [
        MockProvider(TreatmentsState, {
          summary$: of(MOCK_SUMMARY),
          activeProjectArea$: of(undefined),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AcresTreatedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
