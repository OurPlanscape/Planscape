import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { TreatmentProjectAreaComponent } from './treatment-project-area.component';
import { TreatmentsService } from '@services/treatments.service';
import { RouterTestingModule } from '@angular/router/testing';
import { LookupService } from '@services/lookup.service';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { PrescriptionActionsComponent } from '../prescription-actions/prescription-actions.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('ProjectAreaComponent', () => {
  let component: TreatmentProjectAreaComponent;
  let fixture: ComponentFixture<TreatmentProjectAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TreatmentProjectAreaComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        MatSnackBar,
        BrowserAnimationsModule,
      ],
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
