import { Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ModalComponent } from '@styleguide';

@Component({
  selector: 'app-saving-error-modal',
  standalone: true,
  imports: [ModalComponent],
  templateUrl: './saving-error-modal.component.html',
  styleUrl: './saving-error-modal.component.scss',
})
export class SavingErrorModalComponent {
  readonly dialogRef = inject(MatDialogRef<SavingErrorModalComponent>);

  cancelExit(): void {
    this.dialogRef.close(false);
  }

  confirmExit(): void {
    this.dialogRef.close(true);
  }
}
