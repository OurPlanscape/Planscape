import { Component, inject } from '@angular/core';
import { ModalComponent } from '@styleguide';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-exit-workflow-modal',
  standalone: true,
  imports: [ModalComponent],
  templateUrl: './exit-workflow-modal.component.html',
  styleUrl: './exit-workflow-modal.component.scss',
})
export class ExitWorkflowModalComponent {
  readonly dialogRef = inject(MatDialogRef<ExitWorkflowModalComponent>);

  cancelExit(): void {
    this.dialogRef.close(false);
  }

  confirmExit(): void {
    this.dialogRef.close(true);
  }
}
