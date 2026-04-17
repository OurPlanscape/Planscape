import { CommonModule, NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { LegacyMaterialModule } from '@material/legacy-material.module';
import {
  InputDirective,
  InputFieldComponent,
  ModalComponent,
} from '@styleguide';

@Component({
  selector: 'app-create-treatment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    LegacyMaterialModule,
    InputDirective,
    InputFieldComponent,
    ModalComponent,
    NgIf,
  ],
  templateUrl: './create-treatment-dialog.component.html',
  styleUrl: './create-treatment-dialog.component.scss',
})
export class CreateTreatmentDialogComponent {
  submitting: boolean = false;
  treatmentForm = new FormGroup({
    treatmentName: new FormControl('', [Validators.required]),
    standSize: new FormControl(''),
  });

  constructor(
    private dialogRef: MatDialogRef<CreateTreatmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { requestStandSize: boolean }
  ) {
    this.data = data || { requestStandSize: false };
  }

  async submit() {
    if (this.treatmentForm.valid) {
      this.submitting = true;
      const treatmentName =
        this.treatmentForm.get('treatmentName')?.value || '';

      const standSize = this.treatmentForm.get('')?.value || '';
      if (this.data.requestStandSize) {
        this.dialogRef.close({
          treatmentName,
          standSize,
        });
      } else {
        this.dialogRef.close({ treatmentName });
      }
      this.submitting = false;
    }
  }

  cancel(): void {
    this.submitting = false;
    this.dialogRef.close();
  }

  submitIfValid(event: Event) {
    if (this.submitting || this.treatmentForm.invalid) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    this.submit();
  }
}
