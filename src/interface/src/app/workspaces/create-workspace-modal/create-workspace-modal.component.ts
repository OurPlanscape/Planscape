import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { WorkspacesService } from '@services';
import { getFieldError } from '@app/services/errors';
import {
  InputDirective,
  InputFieldComponent,
  ModalComponent,
} from '@styleguide';
import { Workspace } from '@types';

const GENERIC_ERROR = 'Something went wrong. Please try again.';

/**
 * Closes with the created `Workspace`, or `undefined` when cancelled.
 */
@Component({
  selector: 'app-create-workspace-modal',
  standalone: true,
  imports: [
    ModalComponent,
    ReactiveFormsModule,
    InputFieldComponent,
    InputDirective,
  ],
  templateUrl: './create-workspace-modal.component.html',
})
export class CreateWorkspaceModalComponent {
  readonly dialogRef =
    inject<MatDialogRef<CreateWorkspaceModalComponent, Workspace | undefined>>(
      MatDialogRef
    );
  private workspacesService = inject(WorkspacesService);

  form = new FormGroup({
    name: new FormControl('', [Validators.required]),
  });

  submitting = false;
  errorMessage: string | null = null;

  get displayError(): boolean {
    return this.errorMessage !== null;
  }

  handleSubmit() {
    if (this.form.invalid || this.submitting) {
      return;
    }
    this.submitting = true;
    this.workspacesService
      .createWorkspace({ name: this.form.getRawValue().name as string })
      .subscribe({
        next: (workspace) => {
          this.submitting = false;
          this.errorMessage = null;
          this.dialogRef.close(workspace);
        },
        error: (error) => {
          this.submitting = false;
          // A duplicate name comes back as a validation error on `name`;
          // anything else is a failure we can't explain to the user.
          this.errorMessage = getFieldError(error, 'name') ?? GENERIC_ERROR;
        },
      });
  }

  cancel() {
    this.dialogRef.close(undefined);
  }

  get primaryCTA(): string {
    return this.displayError ? 'Try Again' : 'Create';
  }
}
