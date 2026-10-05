import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { WorkspacesService } from '@services';
import { getFieldError } from '@app/services/errors';
import {
  InputDirective,
  InputFieldComponent,
  ModalComponent,
} from '@styleguide';
import { Workspace } from '@types';

const GENERIC_ERROR = 'Something went wrong. Please try again.';

/** Pass a workspace to rename it; leave the data out to create a new one. */
export interface WorkspaceModalData {
  workspace?: Workspace;
}

/**
 * Closes with the created or renamed `Workspace`, or `undefined` when cancelled.
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
  private data = inject<WorkspaceModalData | null>(MAT_DIALOG_DATA, {
    optional: true,
  });

  readonly workspace = this.data?.workspace ?? null;

  form = new FormGroup({
    name: new FormControl(this.workspace?.name ?? '', [Validators.required]),
  });

  submitting = false;
  errorMessage: string | null = null;

  get editMode(): boolean {
    return this.workspace !== null;
  }

  get title(): string {
    return this.editMode ? 'Rename Workspace' : 'New Workspace';
  }

  get displayError(): boolean {
    return this.errorMessage !== null;
  }

  handleSubmit() {
    if (this.form.invalid || this.submitting) {
      return;
    }
    this.submitting = true;
    const name = this.form.getRawValue().name as string;
    const save$ = this.workspace
      ? this.workspacesService.updateWorkspace(this.workspace.id, { name })
      : this.workspacesService.createWorkspace({ name });

    save$.subscribe({
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
    if (this.displayError) {
      return 'Try Again';
    }
    return this.editMode ? 'Done' : 'Create';
  }
}
