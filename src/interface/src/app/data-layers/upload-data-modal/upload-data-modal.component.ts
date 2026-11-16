import { Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ModalComponent } from '@styleguide';
import { QGIS_HELP_URL } from '@shared';

/**
 * Hands the user off to QGIS, where the Planscape plugin uploads their data.
 */
@Component({
  selector: 'app-upload-data-modal',
  standalone: true,
  imports: [ModalComponent],
  templateUrl: './upload-data-modal.component.html',
  styleUrl: './upload-data-modal.component.scss',
})
export class UploadDataModalComponent {
  readonly dialogRef =
    inject<MatDialogRef<UploadDataModalComponent>>(MatDialogRef);

  openHelp() {
    window.open(QGIS_HELP_URL, '_blank');
  }

  continueToQgis() {
    // TODO: hand off to QGIS
  }

  close() {
    this.dialogRef.close();
  }
}
