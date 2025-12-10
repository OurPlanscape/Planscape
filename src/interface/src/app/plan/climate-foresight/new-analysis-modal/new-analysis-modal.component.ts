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

export interface NewAnalysisModalData {
  planningAreaId: number;
  planningAreaName: string;
}

@Component({
  selector: 'app-new-analysis-modal',
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
  templateUrl: './new-analysis-modal.component.html',
  styleUrls: ['./new-analysis-modal.component.scss'],
})
export class NewAnalysisModalComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<NewAnalysisModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: NewAnalysisModalData
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.dialogRef.close({
        name: this.form.value.name,
        planning_area: this.data.planningAreaId,
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
