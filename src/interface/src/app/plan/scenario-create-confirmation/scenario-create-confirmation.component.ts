import { Component, EventEmitter, Input, inject, Output } from '@angular/core';
import { ModalConfirmationDialogComponent } from '../../../styleguide/modal-dialog-section/modal-confirmation-dialog.component';
import { ModalComponent } from '../../../styleguide/modal/modal.component';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-scenario-create-confirmation',
  standalone: true,
  imports: [ModalComponent, ModalConfirmationDialogComponent],
  templateUrl: './scenario-create-confirmation.component.html',
  styleUrl: './scenario-create-confirmation.component.scss',
})
export class ScenarioCreateConfirmationComponent {
  @Input() scenarioName = '';
  @Output() proceed = new EventEmitter<boolean>();
  readonly dialogRef = inject(
    MatDialogRef<ScenarioCreateConfirmationComponent>
  );

  closeModal(): void {
    this.dialogRef.close(false);
  }

  goToTreatmentPlans(): void {
    this.dialogRef.close(true);
  }
}
