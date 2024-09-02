import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { TreatmentProjectAreaComponent } from './treatment-project-area.component';
import { TreatmentsService } from '@services/treatments.service';
import { RouterTestingModule } from '@angular/router/testing';
import { LookupService } from '@services/lookup.service';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { PrescriptionActionsComponent } from '../prescription-actions/prescription-actions.component';

describe('ProjectAreaComponent', () => {
  let component: TreatmentProjectAreaComponent;
  let fixture: ComponentFixture<TreatmentProjectAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentProjectAreaComponent, RouterTestingModule],
      providers: [MockProviders(TreatmentsService, LookupService)],
      declarations: [
        MockDeclarations(TreatmentMapComponent, PrescriptionActionsComponent),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentProjectAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
