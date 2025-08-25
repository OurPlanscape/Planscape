import { Component, inject } from '@angular/core';
import { ModalComponent } from '@styleguide';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-geopackage-failure-modal',
  standalone: true,
  imports: [ModalComponent],
  templateUrl: './geopackage-failure-modal.component.html',
  styleUrl: './geopackage-failure-modal.component.scss'
})
export class GeopackageFailureModalComponent {
  constructor() {}

  readonly dialogRef = inject(MatDialogRef<GeopackageFailureModalComponent>);

  closeModal(): void {
    this.dialogRef.close(false);
  }

  submitFeedback(): void {
    //opens feedback form in new window
    window.open('/feedback', '_blank');
    this.dialogRef.close(true);
  }
}
