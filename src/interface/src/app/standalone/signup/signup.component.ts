import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FormMessageType } from '@types';
import { AuthService } from '@services';
import { timeout, TimeoutError } from 'rxjs';
import { EMAIL_VALIDATION_REGEX, SharedModule } from '@shared';
import { PasswordStateMatcher } from '../../validators/error-matchers';
import { passwordsMustMatchValidator } from '../../validators/passwords';
import { LegacyMaterialModule } from '../../material/legacy-material.module';
import { InfoCardComponent } from '../info-card/info-card.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    InfoCardComponent,
    LegacyMaterialModule,
    ReactiveFormsModule,
    SharedModule,
  ],
})
export class SignupComponent {
  errors: string[] = [];
  form: FormGroup;
  submitting: boolean = false;
  emailAlreadyExists: boolean = false;
  readonly FormMessageType = FormMessageType;
  passwordStateMatcher = new PasswordStateMatcher(['newPasswordsMustMatch']);

  showHint = false;

  constructor(
    private authService: AuthService,
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
        updateOn: 'blur',
      }
    );
  }

  resendEmail() {
    const email: string = this.form.get('email')?.value;
    this.authService.resendValidationEmail(email).subscribe();
  }

  getEmailError(): string | null {
    if (!!this.form.controls['email'].errors) {
      const emailErrors = this.form.controls['email'].errors;
      if ('required' in emailErrors) {
        return 'Email is required.';
      } else if ('pattern' in emailErrors) {
        return 'Email must be the correct format.';
      } else if ('accountExists' in emailErrors) {
        return 'An account with this email already exists.';
      }
      return 'Unknown error.';
    }
    return null;
  }

  getFormErrors(): string | null {
    if (!!this.form.errors) {
      if ('newPasswordsMustMatch' in this.form.errors) {
        return 'Given passwords must match.';
      } else if ('passwordTooCommon' in this.form.errors) {
        return 'This password is too common. Please choose a different password.';
      } else if ('serverError' in this.form.errors) {
        return 'An unexpected server error has occured.';
      } else if ('timeoutError' in this.form.errors) {
        return 'A validation email was not able to be sent at this time. If one does not arrive, you can attempt to login, but you may need to request a new validation email.';
      }
      return 'An unexpected error has occured submitting this form.';
    }
    return null;
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
          this.router.navigate(['thankyou']);
        },
        error: (error: HttpErrorResponse) => {
          this.submitting = false;
          if (error.status == 400) {
            this.errors = Object.values(error.error);

            // Backend Error: Password is too common
            if (
              this.errors.filter((s) =>
                s[0].includes('This password is too common.')
              ).length > 0
            ) {
              this.form.setErrors({ passwordTooCommon: true });
            }

            // Backend Error: An account already exists with this email.
            this.emailAlreadyExists =
              this.errors.filter((s) => s[0].includes('already registered'))
                .length > 0;
            if (this.emailAlreadyExists) {
              this.form.controls['email'].setErrors({ accountExists: true });
            }
          } else if (error.status == 500) {
            this.form.setErrors({ serverError: true });
          } else if (error instanceof TimeoutError) {
            this.form.setErrors({ timeoutError: true });
          } else {
            this.form.setErrors({ unexpectedError: true });
          }
        },
      });
  }
}
