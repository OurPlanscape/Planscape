import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { passwordsMustMatchValidator } from '../validators/passwords';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { FormMessageType } from '../types/data.types';
import { AuthService } from './../services';
import { ValidationEmailDialogComponent } from './validation-email-dialog/validation-email-dialog.component';
import { TimeoutError, timeout } from 'rxjs';
import { EMAIL_VALIDATION_REGEX } from '../shared/constants';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent {
  errors: string[] = [];
  form: FormGroup;
  submitting: boolean = false;
  emailAlreadyExists: boolean = false;
  emailError: string = '';
  signupError: string = '';
  FormMessageType = FormMessageType;

  constructor(
    private authService: AuthService,
    private readonly dialog: MatDialog,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.form = this.formBuilder.group(
      {
        firstName: this.formBuilder.control('', Validators.required),
        lastName: this.formBuilder.control('', Validators.required),
        email: this.formBuilder.control('', [
          Validators.required,
          Validators.pattern(EMAIL_VALIDATION_REGEX),
        ]),
        password1: this.formBuilder.control('', [
          Validators.required,
          Validators.minLength(8),
        ]),
        password2: this.formBuilder.control('', Validators.required),
      },
      {
        validators: [passwordsMustMatchValidator('password1', 'password2')],
      }
    );
  }

  resendEmail() {
    const email: string = this.form.get('email')?.value;
    this.authService.resendValidationEmail(email).subscribe();
  }

  checkEmailErrors() {}

  clearEmailErrors() {}

  clearPasswordErrors() {
    this.form.controls['password1'].setErrors(null);
  }

  getEmailError() {
    var emailErrors = this.form.controls['email'].errors;
    if (emailErrors && 'required' in emailErrors) {
      return 'Email is required.';
    }
    if (emailErrors && 'pattern' in emailErrors) {
      return 'Email must be the correct format.';
    }
    return 'Unknon error.';
  }

  getPasswordError() {
    var passwordErrors = this.form.controls['password1'].errors;

    if (passwordErrors && 'required' in passwordErrors) {
      return 'A password is required.';
    }
    if (passwordErrors && 'minlength' in passwordErrors) {
      return 'A password must be at least 8 characters long.';
    }
    if (passwordErrors && 'PasswordTooCommon' in passwordErrors) {
      return 'This password is too common. Please choose another.';
    }
    //TODO: We need to handle one more error condition -- which is that the password was used in the past...
    return 'Some kind of terrible password error.';
  }
  getConfirmPasswordError() {
    var pwConfirmErrors = this.form.controls['password2'].errors;

    if (pwConfirmErrors && 'required' in pwConfirmErrors) {
      return 'A password is required.';
    }
    if (pwConfirmErrors && 'passwordsMustMatchValidator' in pwConfirmErrors) {
      return 'Pssswords must match.';
    }
    return 'Unknon error.';
  }

  getFormErrors(): string {
    if (this.form.errors && 'newPasswordsMustMatch' in this.form.errors) {
      return 'Given passwords must match.';
    }
    return 'Unknown Error';
  }

  signup() {
    if (this.submitting) return;

    this.submitting = true;

    const email: string = this.form.get('email')?.value;
    const password1: string = this.form.get('password1')?.value;
    const password2: string = this.form.get('password2')?.value;
    const firstName: string = this.form.get('firstName')?.value;
    const lastName: string = this.form.get('lastName')?.value;
    this.authService
      .signup(email, password1, password2, firstName, lastName)
      .pipe(timeout(10000))
      .subscribe({
        next: () => {
          const dialogConfig = {
            data: email,
          };
          this.dialog.open(ValidationEmailDialogComponent, dialogConfig);

          this.router.navigate(['home']);
        },
        error: (error: HttpErrorResponse) => {
          this.submitting = false;
          if (error.status == 400) {
            this.errors = Object.values(error.error);

            // Backend Error: Password is too common
            if (
              this.errors.filter((s) =>
                s[0].includes('This password is too common.')
              )
            ) {
              this.form
                .get('password1')
                ?.setErrors({ PasswordTooCommon: true });
            }

            // Backend Error: An account already exists with this email.
            this.emailAlreadyExists =
              this.errors.filter((s) => s[0].includes('already registered'))
                .length > 0;
            if (this.emailAlreadyExists) {
              this.emailError = 'An Account with this email already exists';
              this.form.get('email')?.setErrors({
                Error: 'An Account with this email already exists',
              });
            }
          } else if (error.status == 500) {
            this.errors = Object.values([
              'An unexpected server error has occured.',
            ]);
          } else if (error instanceof TimeoutError) {
            this.errors = Object.values([
              'The server was not able to send a validation email at this time.',
            ]);
          } else {
            this.errors = Object.values(['An unexpected error has occured.']);
          }
        },
      });
  }
}
