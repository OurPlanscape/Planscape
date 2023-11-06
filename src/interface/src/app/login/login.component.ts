import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services';
import { SNACK_NOTICE_CONFIG } from '../../app/shared/constants';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  protected accountError = '';
  protected offerReverify: boolean = false;

  form: FormGroup;

  readonly text1: string = `
    Planscape is a collaborative effort by the California Natural Resources Agency (CNRA) and the
    USDA Forest Service, with support from Google.org.
  `;

  constructor(
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private router: Router,
    private snackbar: MatSnackBar
  ) {
    this.form = this.formBuilder.group({
      email: this.formBuilder.control('', [
        Validators.required,
        Validators.email,
      ]),
      password: this.formBuilder.control('', Validators.required),
    });
  }

  resendVerification() {
    const email: string = this.form.get('email')?.value;
    this.authService.resendValidationEmail(email).subscribe();
    this.offerReverify = false;
    this.snackbar.open(
      'Sent verification email.',
      'Dismiss',
      SNACK_NOTICE_CONFIG
    );
  }

  login() {
    if (!this.form.valid) return;

    const email: string = this.form.get('email')?.value;
    const password: string = this.form.get('password')?.value;

    this.authService.login(email, password).subscribe(
      (_) => this.router.navigate(['home']),
      (error) => {
        const errorMsg: string = error.error.global[0];
        if (errorMsg === 'E-mail is not verified.') {
          this.accountError = 'Please check your email to verify your account.';
          this.offerReverify = true;
        } else {
          this.accountError = errorMsg;
        }
      }
    );
  }

  signup() {
    this.router.navigate(['signup']);
  }
}
