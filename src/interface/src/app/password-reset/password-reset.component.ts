import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { ActivatedRoute, Data, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { AuthService, PasswordResetToken } from '../services';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';

@UntilDestroy()
@Component({
  selector: 'app-password-reset',
  templateUrl: './password-reset.component.html',
  styleUrls: ['./password-reset.component.scss'],
})
export class PasswordResetComponent implements OnInit {
  errors: string[] = [];

  form: FormGroup;

  passwordResetToken: PasswordResetToken | null = null;

  constructor(
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private router: Router,
    private readonly dialog: MatDialog
  ) {
    this.form = this.formBuilder.group(
      {
        password1: this.formBuilder.control('', []),
        password2: this.formBuilder.control(''),
      },
      {
        validator: this.crossFieldValidators,
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
          this.dialog.open(ConfirmationDialogComponent);
        },
        error: (err: HttpErrorResponse) => {
          const problemFields = Object.keys(err.error);
          problemFields.map((f) => {
            if (f == 'new_password2') {
              this.form.controls['password1'].setErrors({ backendError: true });
            }
            if (f == 'new_password1') {
              this.form.controls['password2'].setErrors({ backendError: true });
            }
          });
          this.errors = Object.values(err.error);
        },
      });
  }

  cancel() {
    this.router.navigate(['login']);
  }

  private crossFieldValidators: ValidatorFn = (
    formControls: AbstractControl
  ): ValidationErrors | null => {
    const password1 = formControls.value.password1;
    const password2 = formControls.value.password2;

    const allTheErrors = {
      newPaswordsMustMatch: false,
      mustBe8Characters: false,
    };

    if (password1.length > 0 && password1.length > 0) {
      if (password1.length < 8) {
        allTheErrors.mustBe8Characters = true;
      }
      if (password1 !== password2) {
        allTheErrors.newPaswordsMustMatch = true;
      }
    }

    if (
      allTheErrors.newPaswordsMustMatch === false &&
      allTheErrors.mustBe8Characters === false
    ) {
      return null;
    }
    return allTheErrors;
  };
}
