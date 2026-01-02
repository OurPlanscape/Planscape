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

export type AnalysisModalMode = 'new' | 'copy';

export interface NewAnalysisModalData {
  mode: AnalysisModalMode;
  planningAreaId?: number;
  runId?: number;
  runName?: string;
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
  title: string;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<NewAnalysisModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: NewAnalysisModalData
  ) {
    const isCopyMode = data.mode === 'copy';
    this.title = isCopyMode ? 'Copy analysis' : 'New analysis';

    const defaultName = isCopyMode ? `Copy of "${data.runName}"` : '';

    this.form = this.fb.group({
      name: [defaultName, [Validators.required, Validators.maxLength(255)]],
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      if (this.data.mode === 'copy') {
        this.dialogRef.close({
          name: this.form.value.name,
        });
      } else {
        this.dialogRef.close({
          name: this.form.value.name,
          planning_area: this.data.planningAreaId,
        });
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
