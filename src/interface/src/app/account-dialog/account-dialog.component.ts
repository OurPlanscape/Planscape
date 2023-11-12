import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Observable, take } from 'rxjs';

import { AuthService } from '../services';
import { User } from '../types';
import { DeleteAccountDialogComponent } from './delete-account-dialog/delete-account-dialog.component';

@Component({
  selector: 'app-account-dialog',
  templateUrl: './account-dialog.component.html',
  styleUrls: ['./account-dialog.component.scss'],
})
export class AccountDialogComponent implements OnInit {
  disableEditButton: boolean = false;
  error: any;
  user$!: Observable<User | null | undefined>;

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    private dialogRef: MatDialogRef<AccountDialogComponent>,
    private router: Router,
    private snackbar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.user$ = this.authService.loggedInUser$;
  }

  displayName(user: User): string {
    if (user.firstName) return user.firstName.concat(' ', user.lastName ?? '');
    else return user.username ?? user.email!;
  }

  logout(): void {
    this.authService
      .logout()
      .pipe(take(1))
      .subscribe((_) => this.close());
  }

  switchToChangePassword(): void {}

  switchToEditAccount(): void {}

  openDeleteAccountDialog(): void {
    this.dialog
      .open(DeleteAccountDialogComponent, {
        data: {
          user: this.authService.loggedInUser$.value,
        },
      })
      .afterClosed()
      .subscribe((data) => {
        if (data.deletedAccount) {
          this.dialogRef.close();
          this.router.navigate(['login']);
        }
      });
  }

  close() {
    this.dialogRef.close();
  }
}
