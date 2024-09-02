import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectAreaComponent } from './project-area.component';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { TreatmentsService } from '@services/treatments.service';
import { RouterTestingModule } from '@angular/router/testing';
import { LookupService } from '@services/lookup.service';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { PrescriptionActionsComponent } from '../prescription-actions/prescription-actions.component';

describe('ProjectAreaComponent', () => {
  let component: ProjectAreaComponent;
  let fixture: ComponentFixture<ProjectAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectAreaComponent, RouterTestingModule],
      providers: [MockProviders(TreatmentsService, LookupService)],
      declarations: [
        MockDeclarations(TreatmentMapComponent, PrescriptionActionsComponent),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
