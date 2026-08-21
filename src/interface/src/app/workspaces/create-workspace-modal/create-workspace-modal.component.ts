import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { WorkspacesService } from '@services';
import {
  InputDirective,
  InputFieldComponent,
  ModalComponent,
} from '@styleguide';
import { Workspace } from '@types';

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
  displayError = false;

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
          this.displayError = false;
          this.dialogRef.close(workspace);
        },
        error: () => {
          this.submitting = false;
          this.displayError = true;
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
