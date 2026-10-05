import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ModalComponent } from '@styleguide';

export interface WorkspaceDeletedModalData {
  workspaceName: string;
}

@Component({
  selector: 'app-workspace-deleted-modal',
  standalone: true,
  imports: [MatDialogModule, ModalComponent],
  templateUrl: './workspace-deleted-modal.component.html',
  styleUrl: './workspace-deleted-modal.component.scss',
})
export class WorkspaceDeletedModalComponent {
  constructor(
    private dialogRef: MatDialogRef<WorkspaceDeletedModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: WorkspaceDeletedModalData
  ) {}

  returnToHome(): void {
    this.dialogRef.close(true);
  }
}
