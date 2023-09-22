import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../services';
import { MatDialog } from '@angular/material/dialog';
import { ResetPasswordDialogComponent } from './reset-password-dialog/reset_password_dialog.component';

import * as signInMessages from '../shared/constants';

@Component({
  selector: 'app-forget-password',
  templateUrl: './forget-password.component.html',
  styleUrls: ['./forget-password.component.scss'],
})
export class ForgetPasswordComponent {
  readonly resetText: string = `
    Enter the email address associated with your account, and we'll email you a link to reset your password.
  `;

  readonly disclaimerText: string = `
    Planscape is a collaborative effort by the California Natural Resources Agency (CNRA) and the
    USDA Forest Service, with support from Google.org.
  `;

  protected readonly RESET_ERROR = signInMessages.MSG_RESET_PASSWORD_ERROR;

  protected accountError = '';

  form: FormGroup;

  constructor(
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private router: Router,
    private readonly dialog: MatDialog
  ) {
    this.form = this.formBuilder.group({
      email: this.formBuilder.control('', [
        Validators.required,
        Validators.email,
      ]),
    });
  }

  submit() {
    if (!this.form.valid) return;

    const email: string = this.form.get('email')?.value;
    this.authService.sendPasswordResetEmail(email).subscribe({
      next: () => {
        this.dialog.open(ResetPasswordDialogComponent);
      },
      error: (err) => {
        this.accountError = this.RESET_ERROR;
      },
    });
  }

  cancel() {
    this.router.navigate(['login']);
  }
}
