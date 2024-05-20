import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '@services';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { ResetPasswordDialogComponent } from '../reset-password-dialog/reset_password_dialog.component';

import {
  EMAIL_VALIDATION_REGEX,
  MSG_RESET_PASSWORD_ERROR,
  SharedModule,
} from '@shared';
import { FormMessageType } from '@types';
import { CommonModule } from '@angular/common';
import { LegacyMaterialModule } from '../../material/legacy-material.module';
import { AboutComponent } from '../about/about.component';

@Component({
  selector: 'app-forget-password',
  templateUrl: './forget-password.component.html',
  styleUrls: ['./forget-password.component.scss'],
  standalone: true,
  imports: [
    AboutComponent,
    CommonModule,
    LegacyMaterialModule,
    ReactiveFormsModule,
    SharedModule,
  ],
})
export class ForgetPasswordComponent {
  readonly resetText: string = `
    Enter the email address associated with your account, and we'll email you a link to reset your password.
  `;
  protected readonly RESET_ERROR = MSG_RESET_PASSWORD_ERROR;
  protected accountError = '';
  protected emailError: string = '';
  form: FormGroup;
  FormMessageType = FormMessageType;

  constructor(
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private router: Router,
    private readonly dialog: MatDialog
  ) {
    this.form = this.formBuilder.group({
      email: this.formBuilder.control('', [
        Validators.required,
        Validators.pattern(EMAIL_VALIDATION_REGEX),
      ]),
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
