import { Component } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';

import { AuthService } from './../services';
import { ValidationEmailDialogComponent } from './validation-email-dialog/validation-email-dialog.component';
import { TimeoutError, timeout } from 'rxjs';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent {
  errors: string[] = [];
  offerResend: boolean = false;
  testedEmail: string = '';
  form: FormGroup;
  submitting: boolean = false;

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
          Validators.email,
        ]),
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

  resendEmail() {
    const email: string = this.form.get('email')?.value;
    console.log("is there an email?", email);
    this.authService.resendValidationEmail(email).subscribe();
    this.offerResend = false;

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
            // offer to resend emails if the user exists. 
            this.offerResend = (this.errors.filter(s => s[0].includes("already registered")).length > 0);
            // TODO: we should probably check to see if their email needs validation or a reset here.

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

  private passwordsMatchValidator(group: AbstractControl) {
    const password1 = group.get('password1')?.value;
    const password2 = group.get('password2')?.value;
    return password1 === password2 ? null : { passwordsNotEqual: true };
  }
}
