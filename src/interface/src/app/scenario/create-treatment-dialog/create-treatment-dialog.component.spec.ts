import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateTreatmentDialogComponent } from './create-treatment-dialog.component';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LegacyMaterialModule } from '@material/legacy-material.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('CreateTreatmentDialogComponent', () => {
  let component: CreateTreatmentDialogComponent;
  let fixture: ComponentFixture<CreateTreatmentDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CreateTreatmentDialogComponent,
        CommonModule,
        ReactiveFormsModule,
        LegacyMaterialModule,
        BrowserAnimationsModule,
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: { close: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateTreatmentDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
