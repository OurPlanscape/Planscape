import { Component } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';

import { AuthService } from './../services';
import { ValidationEmailDialogComponent } from './validation-email-dialog/validation-email-dialog.component';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent {
  errors: string[] = [];

  form: FormGroup;
  submitted: boolean = false;

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

  signup() {
    if (this.submitted) return;

    const email: string = this.form.get('email')?.value;
    const password1: string = this.form.get('password1')?.value;
    const password2: string = this.form.get('password2')?.value;
    const firstName: string = this.form.get('firstName')?.value;
    const lastName: string = this.form.get('lastName')?.value;
    this.authService
      .signup(email, password1, password2, firstName, lastName)
      .subscribe({
        next: () => {
          this.submitted = true;
          this.router.navigate(['home']);
          const dialogConfig = {
            data: email,
          };
          this.dialog.open(ValidationEmailDialogComponent, dialogConfig);
        },
        error: (error: HttpErrorResponse) => {
          this.errors = Object.values(error.error);
          this.submitted = false;
        },
      });
  }

  private passwordsMatchValidator(group: AbstractControl) {
    const password1 = group.get('password1')?.value;
    const password2 = group.get('password2')?.value;
    return password1 === password2 ? null : { passwordsNotEqual: true };
  }
}
