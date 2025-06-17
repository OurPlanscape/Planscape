import { Component, inject } from '@angular/core';
import { ModalComponent } from '@styleguide';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-confirm-exit-drawing-modal',
  standalone: true,
  imports: [ModalComponent],
  templateUrl: './confirm-exit-drawing-modal.component.html',
  styleUrl: './confirm-exit-drawing-modal.component.scss',
})
export class ConfirmExitDrawingModalComponent {
  constructor() {}

  readonly dialogRef = inject(MatDialogRef<ConfirmExitDrawingModalComponent>);

  closeModal(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}
