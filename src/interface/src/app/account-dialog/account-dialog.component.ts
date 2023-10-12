import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
  ValidationErrors,
  ValidatorFn,
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
  user$!: Observable<User | null | undefined>;

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
        currentPassword: this.fb.control('', [Validators.required]),
        newPassword1: this.fb.control('', [
          Validators.required,
          Validators.minLength(8),
        ]),
        newPassword2: this.fb.control('', [Validators.required]),
      },
      {
        validators: [crossFieldValidators],
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

  convertError(e: any): void {
    // potentiall rewrite raw error from backend
    console.log('The error was: ', e);
  }

  savePassword(): void {
    if (this.changePasswordForm.invalid) return;

    this.disableChangeButton = true; // momentarily disable button
    this.authService
      .changePassword(
        this.changePasswordForm.get('currentPassword')?.value,
        this.changePasswordForm.get('newPassword1')?.value,
        this.changePasswordForm.get('newPassword2')?.value
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
        (err: any) => {
          this.convertError(err);
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

  // private passwordsMatchValidator(group: AbstractControl) {
  //   console.log('is this even being called?');
  //   const password1 = group.get('newPassword1')?.value;
  //   const password2 = group.get('newPassword2')?.value;
  //   if (password1 === password2 ) {
  //     this.changePasswordForm.setErrors({validationError: "passwords dont match"})
  //   }

  //   return password1 === password2 ? null : { passwordsNotEqual: true };
  // }

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

//  const passwordsMatchValidator: ValidatorFn = ( formControls: AbstractControl): ValidationErrors | null => {
//   const password1 = formControls.value.currentPassword;
//   const password2 = formControls.value.newPassword1;

//   console.log("what is group?", formControls);
//   console.log("what is pw1?", password1);
//   console.log("what is pw2?", password2);
//   console.log("what is pw1?", password1);

//   return password1 === password2 ?  null : { passwordsDontMatch: true };
// };

const crossFieldValidators: ValidatorFn = (
  formControls: AbstractControl
): ValidationErrors | null => {
  const currentPassword = formControls.value.currentPassword;
  const password1 = formControls.value.newPassword1;
  const password2 = formControls.value.newPassword2;

  const allTheErrors = {
    newPasswordMustBeNew: false,
    newPaswordsMustMatch: false,
    mustContainSymbol: false,
    mustContainNumber: false,
  };

  if (
    currentPassword.length > 0 &&
    password1.length > 0 &&
    password2.length > 0
  ) {
    if (currentPassword === password1) {
      allTheErrors.newPasswordMustBeNew = true;
    }

    if (password1 !== password2) {
      allTheErrors.newPaswordsMustMatch = true;
    }
  }
  console.log('group?:', formControls);
  console.log('all the errors:', allTheErrors);

  if (Object.entries(allTheErrors).some(([key, value]) => value !== false)) {
    console.log('any not false?:', allTheErrors);
    return allTheErrors;
  }
  return null;
};
