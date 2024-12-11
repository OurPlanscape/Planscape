import {
  Component,
  EventEmitter,
  Input,
  Inject,
  inject,
  Output,
} from '@angular/core';
import { ModalConfirmationDialogComponent } from '../../../styleguide/modal-dialog-section/modal-confirmation-dialog.component';
import { ModalComponent } from '../../../styleguide/modal/modal.component';
import { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-scenario-create-confirmation',
  standalone: true,
  imports: [ModalComponent, ModalConfirmationDialogComponent],
  templateUrl: './scenario-create-confirmation.component.html',
  styleUrl: './scenario-create-confirmation.component.scss',
})
export class ScenarioCreateConfirmationComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  @Input() scenarioName = this.data.response?.name;
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
