import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Data, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FormMessageType } from '../types';
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
  FormMessageType = FormMessageType;

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
        validator: this.passwordsMatchValidator,
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
          this.errors = Object.values(err.error);
        },
      });
  }

  cancel() {
    this.router.navigate(['login']);
  }

  getErrors(): string {
    if (this.errors.length > 0) {
      return this.errors.join(' ');
    }
    return '';
  }

  private passwordsMatchValidator(group: AbstractControl) {
    const password1 = group.get('password1')?.value;
    const password2 = group.get('password2')?.value;
    return password1 === password2 ? null : { passwordsNotEqual: true };
  }
}
