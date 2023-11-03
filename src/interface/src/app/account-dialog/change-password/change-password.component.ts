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

import { AuthService } from '../../services';
import { User } from '../../types';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss'],
})
export class ChangePasswordComponent implements OnInit {
  changingPassword: boolean = false;
  changePasswordForm: FormGroup;
  disableChangeButton: boolean = false;
  disableEditButton: boolean = false;
  error: any;
  user$!: Observable<User | null | undefined>;

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
    private snackbar: MatSnackBar,
    private router: Router,

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
  }

  changePassword(): void {
    this.changingPassword = true;
    this.error = null;
  }

  ngOnInit(): void {
    this.user$ = this.authService.loggedInUser$;
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
            duration: 10000,
            verticalPosition: 'top',
          });
        },
        (err: any) => {
          this.error = Object.values(err.error);
          this.disableChangeButton = false;
        }
      );
  }
}

const crossFieldValidators: ValidatorFn = (
  formControls: AbstractControl
): ValidationErrors | null => {
  const currentPassword = formControls.value.currentPassword;
  const password1 = formControls.value.newPassword1;
  const password2 = formControls.value.newPassword2;

  const allTheErrors = {
    newPasswordMustBeNew: false,
    newPaswordsMustMatch: false,
    mustContainNumber: false,
    mustContainUpper: false,
    mustContainLower: false,
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
    if (!/[0-9]+/.test(password1)) {
      allTheErrors.mustContainNumber = true;
    }
    if (!/[A-Z]+/.test(password1)) {
      allTheErrors.mustContainUpper = true;
    }
    if (!/[a-z]+/.test(password1)) {
      allTheErrors.mustContainLower = true;
    }
  }
  if (Object.entries(allTheErrors).some(([key, value]) => value !== false)) {
    return allTheErrors;
  }
  return null;
};
