import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Data, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FormMessageType } from '@types';
import { AuthService, PasswordResetToken } from '@services';

import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SharedModule } from '@shared';
import { AboutComponent } from '../about/about.component';
import { PasswordStateMatcher } from '../../validators/error-matchers';
import { passwordsMustMatchValidator } from '../../validators/passwords';
import { PasswordConfirmationDialogComponent } from '../password-confirmation-dialog/password-confirmation-dialog.component';

@UntilDestroy()
@Component({
  selector: 'app-password-reset',
  templateUrl: './password-reset.component.html',
  styleUrls: ['./password-reset.component.scss'],
  standalone: true,
  imports: [
    AboutComponent,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterModule,
    SharedModule,
  ],
})
export class PasswordResetComponent implements OnInit {
  form: FormGroup;
  passwordResetToken: PasswordResetToken | null = null;
  FormMessageType = FormMessageType;
  currentPasswordStateMatcher = new PasswordStateMatcher([]);
  passwordStateMatcher = new PasswordStateMatcher(['newPasswordsMustMatch']);
  confirmPasswordStateMatcher = new PasswordStateMatcher([
    'newPasswordsMustMatch',
  ]);
  showHint = false;

  constructor(
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private router: Router,
    private readonly dialog: MatDialog
  ) {
    this.form = this.formBuilder.group(
      {
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

  ngOnInit() {
    this.activatedRoute.data
      .pipe(untilDestroyed(this))
      .subscribe((data: Data) => {
        if (!data || data['passwordResetToken'] === null) {
          this.router.navigate(['reset']);
          return;
        }
        const userId = data['passwordResetToken']['userId'];
        const token = data['passwordResetToken']['token'];
        this.passwordResetToken = { userId, token };
      });
  }

  submit() {
    if (!this.form.valid) return;
    const userId: string = this.passwordResetToken!.userId;
    const token: string = this.passwordResetToken!.token;
    const password1: string = this.form.get('password1')?.value;
    const password2: string = this.form.get('password2')?.value;
    this.authService
      .resetPassword(userId, token, password1, password2)
      .subscribe({
        next: () => {
          this.dialog.open(PasswordConfirmationDialogComponent);
        },
        error: (err: HttpErrorResponse) => {
          this.form.setErrors({ backendError: Object.values(err.error) });
        },
      });
  }

  cancel() {
    this.router.navigate(['login']);
  }

  getErrors(): string | null {
    if (this.form.errors) {
      let errorString = '';
      const formErrors = this.form.errors;
      if ('newPasswordsMustMatch' in formErrors) {
        errorString = 'Passwords must match.';
      } else if ('backendError' in formErrors) {
        errorString = formErrors['backendError'];
      } else {
        errorString = 'An unkown error has occurred.';
      }
      return errorString;
    }
    return null;
  }
}
