import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { ScenarioCreateConfirmationComponent } from './scenario-create-confirmation.component';

describe('ScenarioCreateConfirmationComponent', () => {
  let component: ScenarioCreateConfirmationComponent;
  let fixture: ComponentFixture<ScenarioCreateConfirmationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioCreateConfirmationComponent, MatDialogModule],
      declarations: [],
      providers: [
        { provide: MatDialogRef, useValue: {} }, // Mock or stub MatDialogRef
        { provide: MAT_DIALOG_DATA, useValue: {} }, // Mock or stub the data
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
