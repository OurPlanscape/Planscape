import { Component, inject } from '@angular/core';
import { ModalComponent } from '@styleguide';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-no-planning-area-modal',
  standalone: true,
  imports: [ModalComponent],
  templateUrl: './no-planning-area-modal.component.html',
  styleUrl: './no-planning-area-modal.component.scss',
})
export class NoPlanningAreaModalComponent {
  constructor() {}

  readonly dialogRef = inject(MatDialogRef<NoPlanningAreaModalComponent>);

  closeModal(): void {
    this.dialogRef.close(false);
  }

  goToTreatmentPlans(): void {
    this.dialogRef.close(true);
  }
}
