import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplyTreatmentComponent } from './apply-treatment.component';
import { MockProviders } from 'ng-mocks';
import { TreatmentsState } from '../treatments.state';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';

describe('ApplyTreatmentComponent', () => {
  let component: ApplyTreatmentComponent;
  let fixture: ComponentFixture<ApplyTreatmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplyTreatmentComponent, NoopAnimationsModule],
      providers: [
        MockProviders(TreatmentsState, SelectedStandsState, TreatedStandsState),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ApplyTreatmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
