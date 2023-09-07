import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
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
  changingPassword: boolean = false;
  changePasswordForm: FormGroup;
  disableChangeButton: boolean = false;
  disableEditButton: boolean = false;
  editingAccount: boolean = false;
  editAccountForm: FormGroup;
  error: any;
  user$!: Observable<User | null>;

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    private dialogRef: MatDialogRef<AccountDialogComponent>,
    private fb: FormBuilder,
    private router: Router,
    private snackbar: MatSnackBar
  ) {
    this.changePasswordForm = this.fb.group(
      {
        password0: this.fb.control('', [Validators.required]),
        password1: this.fb.control('', [
          Validators.required,
          Validators.minLength(8),
        ]),
        password2: this.fb.control('', [Validators.required]),
      },
      {
        validator: this.passwordsMatchValidator,
      }
    );
    this.editAccountForm = this.fb.group({
      firstName: this.fb.control('', Validators.required),
      lastName: this.fb.control('', Validators.required),
      email: this.fb.control('', [Validators.required, Validators.email]),
    });
  }

  ngOnInit(): void {
    this.user$ = this.authService.loggedInUser$;
  }

  displayName(user: User): string {
    if (user.firstName) return user.firstName.concat(' ', user.lastName ?? '');
    else return user.username ?? user.email!;
  }

  changePassword(): void {
    this.changingPassword = true;
    this.error = null;
  }

  editAccount(): void {
    const user = this.authService.loggedInUser$.getValue();
    this.editAccountForm.get('firstName')?.setValue(user?.firstName);
    this.editAccountForm.get('lastName')?.setValue(user?.lastName);
    this.editAccountForm.get('email')?.setValue(user?.email);
    this.editingAccount = true;
    this.error = null;
  }

  logout(): void {
    this.authService.logout().pipe(take(1)).subscribe();
  }

  savePassword(): void {
    if (this.changePasswordForm.invalid) return;

    this.disableChangeButton = true;
    alert("password0: " + this.changePasswordForm.get('password0')?.value);
    this.authService
      .changePassword(
        this.changePasswordForm.get('password0')?.value,
        this.changePasswordForm.get('password1')?.value,
        this.changePasswordForm.get('password2')?.value
      )
      .pipe(take(1))
      .subscribe(
        (_) => {
          this.changingPassword = false;
          this.disableChangeButton = false;
          this.error = null;
          this.snackbar.open('Updated password successfully', undefined, {
            duration: 3000,
          });
        },
        (err) => {
          this.error = err;
          this.disableChangeButton = false;
        }
      );
  }

  saveEdits(): void {
    if (this.editAccountForm.invalid) return;

    this.disableEditButton = true;

    this.authService
      .updateUser({
        firstName: this.editAccountForm.get('firstName')?.value,
        lastName: this.editAccountForm.get('lastName')?.value,
        email: this.editAccountForm.get('email')?.value,
      })
      .pipe(take(1))
      .subscribe(
        (_) => {
          this.editingAccount = false;
          this.disableEditButton = false;
          this.error = null;
          this.snackbar.open('Updated account successfully', undefined, {
            duration: 3000,
          });
        },
        (err) => {
          this.error = err;
          this.disableEditButton = false;
        }
      );
  }

  private passwordsMatchValidator(group: AbstractControl) {
    const password1 = group.get('password1')?.value;
    const password2 = group.get('password2')?.value;
    return password1 === password2 ? null : { passwordsNotEqual: true };
  }

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
}
