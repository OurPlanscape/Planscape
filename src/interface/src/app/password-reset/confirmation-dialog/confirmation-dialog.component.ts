import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
})
export class ConfirmationDialogComponent {
  protected readonly checkImageUrl = '/assets/png/gm_done_gm_grey_24dp.png';

  constructor(
    private readonly dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    private router: Router
  ) {}

  close() {
    this.dialogRef.close();
    this.router.navigate(['login']);
  }
}
