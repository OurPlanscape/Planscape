import { CommonModule } from '@angular/common';
import { Component, inject, Inject, Input } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
  InputDirective,
  InputFieldComponent,
  ModalComponent,
} from '@styleguide';

@Component({
  selector: 'app-name-pillar-modal',
  standalone: true,
  imports: [
    CommonModule,
    ModalComponent,
    ReactiveFormsModule,
    InputFieldComponent,
    InputDirective,
    MatFormFieldModule,
  ],
  templateUrl: './name-pillar-modal.component.html',
  styleUrl: './name-pillar-modal.component.scss',
})
export class NamePillarModalComponent {
  // TODO: Add type once we have the interface for pillars
  @Input() pillar = null;

  form: FormGroup = new FormGroup({
    pillarName: new FormControl(null, [Validators.required]),
  });

  readonly dialogRef = inject(MatDialogRef<NamePillarModalComponent>);

  submitting = false;
  displayError = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  handleSubmit() {
    if (this.form.valid && !this.submitting) {
      if (this.editMode) {
        this.edit();
      } else {
        this.create();
      }
    }
  }

  create() {
    /**
     * TODO: Integrate with backend once API is ready
     * Validate the name doesn't exist
     * Call backend
     * If Success - Close modal - refresh list (on parent)
     * If Error - Display error - Try again
     */
    this.dialogRef.close();
  }

  edit() {
    /**
     * TODO: Integrate with backend once API is ready
     * Validate the name doesn't exist
     * Call backend
     * If Success - Close modal - refresh list (on parent)
     * If Error - Display error - Try again
     */
    this.dialogRef.close();
  }

  cancel() {
    this.dialogRef.close();
  }

  get editMode(): boolean {
    return this.pillar !== null;
  }

  get primaryCTA(): string {
    if (this.displayError) {
      return 'Try Again';
    } else if (this.editMode) {
      return 'Done';
    }
    return 'Create';
  }
}
