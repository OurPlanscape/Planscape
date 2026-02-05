import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentSummaryDialogComponent } from './treatment-summary-dialog.component';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

describe('TreatmentSummaryDialogComponent', () => {
  let component: TreatmentSummaryDialogComponent;
  let fixture: ComponentFixture<TreatmentSummaryDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentSummaryDialogComponent, MatDialogModule],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {},
          },
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {},
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentSummaryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
