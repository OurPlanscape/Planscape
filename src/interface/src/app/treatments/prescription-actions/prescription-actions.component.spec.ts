import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrescriptionActionsComponent } from './prescription-actions.component';
import { MockProviders } from 'ng-mocks';
import { LookupService } from '@services/lookup.service';
import { TreatmentsState } from '../treatments.state';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';

describe('PrescriptionActionsComponent', () => {
  let component: PrescriptionActionsComponent;
  let fixture: ComponentFixture<PrescriptionActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrescriptionActionsComponent],
      providers: [
        MockProviders(LookupService, TreatmentsState, SelectedStandsState),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrescriptionActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
