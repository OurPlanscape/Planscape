import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import {
  MatDialog,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { ScenarioSetupModalComponent } from '@app/scenario/scenario-setup-modal/scenario-setup-modal.component';
import { FeatureService } from '@app/features/feature.service';
import { MockProvider } from 'ng-mocks';

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
        MockProvider(FeatureService),
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
