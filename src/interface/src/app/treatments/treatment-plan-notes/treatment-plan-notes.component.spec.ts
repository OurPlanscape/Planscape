import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TreatmentPlanNotesComponent } from './treatment-plan-notes.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TreatmentsState } from '../treatments.state';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject, of } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TreatmentPlanNotesService } from '../../services/notes.service';

describe('TreatmentPlanNotesComponent', () => {
  let component: TreatmentPlanNotesComponent;
  let fixture: ComponentFixture<TreatmentPlanNotesComponent>;
  let mockNotesService: TreatmentPlanNotesService;

  beforeEach(async () => {
    mockNotesService = jasmine.createSpyObj('PlanningAreaNotesService', [
      'getNotes',
      'addNote',
      'deleteNote',
    ]);
    Object.assign(mockNotesService, {
      modelName: 'treatment_plan',
      multipleUrl: 'mock-multiple-url',
      singleUrl: 'mock-single-url',
    });
    (mockNotesService.getNotes as jasmine.Spy).and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        TreatmentPlanNotesComponent,
        HttpClientTestingModule,
        MatDialogModule,
        MatSnackBarModule,
      ],
      providers: [
        { provide: TreatmentPlanNotesService, useValue: mockNotesService },
        MockProvider(TreatmentsState, {
          treatmentPlan$: new BehaviorSubject(null),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentPlanNotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
