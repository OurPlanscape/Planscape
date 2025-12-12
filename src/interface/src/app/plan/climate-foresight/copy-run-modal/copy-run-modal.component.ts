import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  InputDirective,
  InputFieldComponent,
  ModalComponent,
} from '@styleguide';

export interface CopyRunModalData {
  runId: number;
  runName: string;
}

@Component({
  selector: 'app-copy-run-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    InputDirective,
    InputFieldComponent,
    ModalComponent,
  ],
  templateUrl: './copy-run-modal.component.html',
  styleUrls: [],
})
export class CopyRunModalComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CopyRunModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CopyRunModalData
  ) {
    this.form = this.fb.group({
      name: [
        `Copy of "${data.runName}"`,
        [Validators.required, Validators.maxLength(255)],
      ],
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.dialogRef.close({
        name: this.form.value.name,
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
