import { Component, ViewChild } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
  ValidationErrors,
  ValidatorFn,
  // FormControl,
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatMenu } from '@angular/material/menu';
import { AuthService } from './../services';
import { ValidationEmailDialogComponent } from './validation-email-dialog/validation-email-dialog.component';
import { TimeoutError, timeout } from 'rxjs';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent {
  @ViewChild('policyMenu') policyMenu: MatMenu | undefined;

  errors: string[] = [];
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
        email: this.formBuilder.control('', [Validators.email]),
        password1: this.formBuilder.control('', []),
        password2: this.formBuilder.control(''),
      },
      {
        validator: this.crossFieldValidators,
      }
    );
  }

  showPolicy() {
    const policyBox = document.getElementById('policyBox');
    if (policyBox !== null) {
      policyBox.style.display = 'block';
    }
  }

  hidePolicy() {
    const policyBox = document.getElementById('policyBox');
    if (policyBox !== null) {
      policyBox.style.display = 'none';
    }
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
            // intercept the problematic fields from the backend, then set an error manually on each field
            const problemFields = Object.keys(error.error);
            problemFields.map((f) =>
              this.form.controls[f].setErrors({ backendError: true })
            );
            this.errors = Object.values(error.error);
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

  private crossFieldValidators: ValidatorFn = (
    formControls: AbstractControl
  ): ValidationErrors | null => {
    const password1 = formControls.value.password1;
    const password2 = formControls.value.password2;
    const email = formControls.value.email;

    // Note that Django also validates email formats, but it uses a different regex.
    // So unless the regexes are equivalent, a user can get an error from Django but not
    //  from Angular. Below is the same regex from Django's email validation regex:
    const emailRegex = /^[\w+\.-]+@[\w+\.-]+\.[a-zA-Z]{2,}$/;

    const allTheErrors = {
      newPaswordsMustMatch: false,
      mustBe8Characters: false,
      emailIsInvalid: false,
    };

    if (!emailRegex.test(email) && email.length > 0) {
      allTheErrors.emailIsInvalid = true;
    }

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
      allTheErrors.emailIsInvalid === false &&
      allTheErrors.mustBe8Characters === false
    ) {
      return null;
    }
    return allTheErrors;
  };
}
