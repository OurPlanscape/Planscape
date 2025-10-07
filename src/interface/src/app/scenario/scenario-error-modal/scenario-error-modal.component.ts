import { Component, Inject, Optional } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ModalComponent } from '@styleguide';

@Component({
  selector: 'app-scenario-error-modal',
  standalone: true,
  imports: [ModalComponent],
  templateUrl: './scenario-error-modal.component.html',
  styleUrl: './scenario-error-modal.component.scss',
})
export class ScenarioErrorModalComponent {
  constructor(
    private dialogRef: MatDialogRef<ScenarioErrorModalComponent>,
    @Optional()
    @Inject(MAT_DIALOG_DATA)
    public data?: { title: string; message: string }
  ) {}

  cancelExit(): void {
    this.dialogRef.close(false);
  }

  confirmExit(): void {
    this.dialogRef.close(true);
  }
}
