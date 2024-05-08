import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { CommonModule } from '@angular/common';
import { LegacyMaterialModule } from '../../material/legacy-material.module';

@Component({
  selector: 'app-password-confirmation-dialog',
  templateUrl: './password-confirmation-dialog.component.html',
  standalone: true,
  imports: [CommonModule, LegacyMaterialModule],
})
export class PasswordConfirmationDialogComponent {
  protected readonly checkImageUrl = '/assets/png/gm_done_gm_grey_24dp.png';

  constructor(
    private readonly dialogRef: MatDialogRef<PasswordConfirmationDialogComponent>,
    private router: Router
  ) {}

  close() {
    this.dialogRef.close();
    this.router.navigate(['login']);
  }
}
