import { Component } from '@angular/core';
import { DeleteAccountDialogComponent } from '../../account-dialog/delete-account-dialog/delete-account-dialog.component';
import { AuthService } from '../../services';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

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
