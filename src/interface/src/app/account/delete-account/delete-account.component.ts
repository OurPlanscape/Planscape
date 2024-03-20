import { Component } from '@angular/core';
import { AuthService } from '@services';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { Router } from '@angular/router';
import { DeleteAccountDialogComponent } from '../delete-account-dialog/delete-account-dialog.component';

@Component({
  selector: 'app-delete-account',
  templateUrl: './delete-account.component.html',
  styleUrls: ['./delete-account.component.scss'],
})
export class DeleteAccountComponent {
  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  openDeleteAccountDialog(): void {
    this.dialog
      .open(DeleteAccountDialogComponent, {
        data: {
          user: this.authService.loggedInUser$.value,
        },
      })
      .afterClosed()
      .subscribe((data) => {
        if (data?.deletedAccount) {
          this.router.navigate(['login']);
        }
      });
  }
}
