import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { AuthService } from '@services';
import { FormMessageType } from '@types';

import {
  EMAIL_VALIDATION_REGEX,
  SharedModule,
  SNACK_ERROR_CONFIG,
  SNACK_NOTICE_CONFIG,
} from '@shared';
import { MatCardModule } from '@angular/material/card';

import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material/material.module';
import { AboutComponent } from '../about/about.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    AboutComponent,
    CommonModule,
    MatCardModule,
    MaterialModule,
    ReactiveFormsModule,
    RouterModule,
    SharedModule,
  ],
})
export class LoginComponent {
  protected offerReverify: boolean = false;
  protected loginError = '';
  protected passwordError: string = '';
  protected emailError: string = '';
  form: FormGroup;
  FormMessageType = FormMessageType;

  constructor(
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private router: Router,
    private snackbar: MatSnackBar
  ) {
    this.form = this.formBuilder.group({
      email: this.formBuilder.control('', [
        Validators.required,
        Validators.pattern(EMAIL_VALIDATION_REGEX),
      ]),
      password: this.formBuilder.control('', Validators.required),
    });
  }

  checkEmailErrors() {
    if (this.form.controls['email'].errors !== null) {
      this.emailError = 'Email must be in a proper format.';
    }
  }

  clearEmailErrors() {
    if (this.emailError !== '') {
      this.emailError = '';
    }
  }

  resendVerification() {
    const email = this.form.get('email')?.value;
    this.authService.resendValidationEmail(email).subscribe({
      next: () => {
        this.offerReverify = false;
        this.snackbar.open(
          'Sent verification email.',
          'Dismiss',
          SNACK_NOTICE_CONFIG
        );
      },
      error: (err: String) => {
        this.snackbar.open(`Error: ${err}`, 'Dismiss', SNACK_ERROR_CONFIG);
      },
    });
  }

  login() {
    if (!this.form.valid) return;

    const email: string = this.form.get('email')?.value;
    const password: string = this.form.get('password')?.value;

    this.authService.login(email, password).subscribe(
      (redirect) => {
        this.router.navigate([redirect]);
      },
      (error) => {
        // determine the cause of the error...
        // errors from the backend can be in a variety of formats

        // present the user with the strings that we decided for UX, rather than
        //  the errors provided by the backend and dj-rest-auth
        var errorMsg: string = '';

        if (error.error.email) {
          this.form.controls['email'].setErrors({
            email: 'Email must be in the proper format.',
          });
        }
        if (error.error.global) {
          errorMsg = error.error.global[0];
          this.form.setErrors({ error: errorMsg });
          if (errorMsg === 'E-mail is not verified.') {
            this.loginError = 'Please check your email to verify your account.';
            this.offerReverify = true;
          } else if (
            errorMsg === 'Unable to log in with provided credentials.'
          ) {
            this.loginError =
              'Either the user name or password that you have entered is incorrect. Please try again.';
            this.offerReverify = false;
          } else {
            this.loginError = errorMsg;
          }
        }
      }
    );
  }

  signup() {
    this.router.navigate(['signup']);
  }
}
