import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AcresTreatedComponent } from './acres-treated.component';
import { MockProvider } from 'ng-mocks';
import { TreatmentsState } from '../treatments.state';
import { MOCK_SUMMARY } from '../mocks';
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
