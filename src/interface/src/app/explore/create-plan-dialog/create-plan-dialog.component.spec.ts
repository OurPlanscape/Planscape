import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { CreatePlanDialogComponent } from './create-plan-dialog.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { DrawService } from '@maplibre-map/draw.service';
import { PlanService } from '@services';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

describe('ExplorePlanCreateDialogComponent', () => {
  let component: CreatePlanDialogComponent;
  let fixture: ComponentFixture<CreatePlanDialogComponent>;
  let planService: PlanService;

  const nameExistsError = new HttpErrorResponse({
    status: 400,
    error: {
      detail: 'Validation error.',
      errors: { name: ['A planning area with this name already exists.'] },
    },
  });

  beforeEach(async () => {
    const fakeDrawService = {
      getCurrentAcreageValue: jasmine
        .createSpy('getCurrentAcreageValue')
        .and.returnValue(101),
      hasUploadedData: () => false,
      getDrawingGeoJSON: () => ({ geometry: { type: 'Polygon' } }),
    };
    const fakeDialogRef = jasmine.createSpyObj(
      'MatDialogRef',
      {
        close: undefined,
      },
      {}
    );

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        MatDialogModule,
        MatSnackBarModule,
        CreatePlanDialogComponent,
      ],
      providers: [
        {
          provide: DrawService,
          useValue: fakeDrawService,
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { drawService: fakeDrawService },
        },
        {
          provide: MatDialogRef<CreatePlanDialogComponent>,
          useValue: fakeDialogRef,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreatePlanDialogComponent);
    component = fixture.componentInstance;
    planService = TestBed.inject(PlanService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the name exists error when the backend rejects a duplicate name on create', () => {
    spyOn(planService, 'createPlan').and.returnValue(
      throwError(() => nameExistsError)
    );
    component.planForm.get('planName')?.setValue('Same name');

    component.submitPlan();

    expect(component.planForm.hasError('planNameExists')).toBeTrue();
    expect(component.submitting).toBeFalse();
  });

  it('shows the name exists error when the backend rejects a duplicate name on rename', () => {
    component.data.planId = 1;
    spyOn(planService, 'editPlanName').and.returnValue(
      throwError(() => nameExistsError)
    );
    component.planForm.get('planName')?.setValue('Same name');

    component.submitPlan();

    expect(component.planForm.hasError('planNameExists')).toBeTrue();
    expect(component.displayError).toBeFalse();
  });
});
