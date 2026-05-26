import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { FEATURES_JSON } from '@app/features/features-config';
import { ScenarioCreateConfirmationComponent } from './scenario-create-confirmation.component';

describe('ScenarioCreateConfirmationComponent', () => {
  let component: ScenarioCreateConfirmationComponent;
  let fixture: ComponentFixture<ScenarioCreateConfirmationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioCreateConfirmationComponent, MatDialogModule],
      declarations: [],
      providers: [
        { provide: FEATURES_JSON, useValue: { valid: true } },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioCreateConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
