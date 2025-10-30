import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import {
  MatDialog,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { ScenarioSetupModalComponent } from './scenario-setup-modal.component';
import { ActivatedRoute } from '@angular/router';

describe('ScenarioSetupModalComponent', () => {
  let component: ScenarioSetupModalComponent;
  let fixture: ComponentFixture<ScenarioSetupModalComponent>;
  const fakeDialogRef = jasmine.createSpyObj(
    'MatDialogRef',
    {
      close: undefined,
    },
    {}
  );
  const fakeDialog = jasmine.createSpyObj(
    'MatDialog',
    {
      open: undefined,
    },
    {}
  );
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        ScenarioSetupModalComponent,
        MatSnackBarModule,
      ],
      providers: [
        {
          provide: MatDialogRef<ScenarioSetupModalComponent>,
          useValue: fakeDialogRef,
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {},
        },
        {
          provide: MatDialog,
          useValue: fakeDialog,
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { planId: 'mockPlanId' }, // Add any other required data here
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioSetupModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
