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
  let mockDialogRef: jasmine.SpyObj<
    MatDialogRef<CreateTreatmentDialogComponent>
  >;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        CommonModule,
        CreateTreatmentDialogComponent,
        LegacyMaterialModule,
        ReactiveFormsModule,
      ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: {} }, // Default empty
      ],
    }).compileComponents();
  });

  // Helper to re-create the component with specific data
  const createComponent = (data: { requestStandSize: boolean }) => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });
    fixture = TestBed.createComponent(CreateTreatmentDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('should close with name and standSize when requestStandSize is true', async () => {
    createComponent({ requestStandSize: true });

    component.treatmentForm.setValue({
      treatmentName: 'Test Treatment',
      standSize: 'LARGE',
    });

    await component.submit();

    expect(mockDialogRef.close).toHaveBeenCalledWith({
      treatmentName: 'Test Treatment',
      standSize: 'LARGE',
    });
  });

  it('should close with ONLY name when requestStandSize is false', async () => {
    createComponent({ requestStandSize: false });

    component.treatmentForm.setValue({
      treatmentName: 'Simple Treatment',
      standSize: 'MEDIUM',
    });

    await component.submit();

    expect(mockDialogRef.close).toHaveBeenCalledWith({
      treatmentName: 'Simple Treatment',
    });
  });

  it('should not close if form is invalid', async () => {
    createComponent({ requestStandSize: true });

    component.treatmentForm.setValue({
      treatmentName: '',
      standSize: 'SMALL',
    });

    await component.submit();

    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });
});
