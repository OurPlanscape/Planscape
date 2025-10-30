import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LegacyMaterialModule } from 'src/app/material/legacy-material.module';
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
  ],
  templateUrl: './create-treatment-dialog.component.html',
  styleUrl: './create-treatment-dialog.component.scss',
})
export class CreateTreatmentDialogComponent {
  submitting: boolean = false;
  treatmentForm = new FormGroup({
    treatmentName: new FormControl('', [Validators.required]),
  });

  constructor(
    private dialogRef: MatDialogRef<CreateTreatmentDialogComponent>
  ) {}

  async submit() {
    if (this.treatmentForm.valid) {
      this.submitting = true;
      const treatmentName =
        this.treatmentForm.get('treatmentName')?.value || '';
      this.dialogRef.close(treatmentName);
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
