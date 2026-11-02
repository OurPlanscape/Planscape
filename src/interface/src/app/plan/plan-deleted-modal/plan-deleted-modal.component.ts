import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ModalComponent } from '@styleguide';

export interface PlanDeletedModalData {
  planName: string;
}

@Component({
  selector: 'app-plan-deleted-modal',
  standalone: true,
  imports: [MatDialogModule, ModalComponent],
  templateUrl: './plan-deleted-modal.component.html',
  styleUrl: './plan-deleted-modal.component.scss',
})
export class PlanDeletedModalComponent {
  constructor(
    private dialogRef: MatDialogRef<PlanDeletedModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PlanDeletedModalData
  ) {}

  close(): void {
    this.dialogRef.close(true);
  }
}
