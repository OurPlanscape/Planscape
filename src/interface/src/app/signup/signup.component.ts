import { Component, ViewChild} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
  ValidationErrors,
  ValidatorFn
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
  @ViewChild('policyMenu') policyMenu : MatMenu | undefined;

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
        email: this.formBuilder.control('', [
         // Validators.required,
          Validators.email,
        ]),
        password1: this.formBuilder.control('', [
         // Validators.required,
          //Validators.minLength(8),
        ]),
        password2: this.formBuilder.control('',
        // Validators.required
        ),
      },
      {
        validator: this.crossFieldValidators,
      }
    );
  }

  showPolicy() {
    console.log('we are shwoing it...');
    const policyBox = document.getElementById('policyBox');
    console.log('do we have a thing?', policyBox);
    if (policyBox !== null) {
      policyBox.style.display = "block";
      console.log('we are showing?...', policyBox.style.display);
    }
    }

  hidePolicy() {
    console.log('we are hiding it...');
    const policyBox = document.getElementById('policyBox');
    if (policyBox !== null) {
      policyBox.style.display = 'none';
      console.log('we are hiding?...', policyBox.style);
    }
  }

  signup() {
    if (this.submitting) return;

    this.submitting = true;

    console.log('Form after submission:', this.form);

    console.log('is it dirty?', this.form.dirty);

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
  
    const allTheErrors = {
      newPaswordsMustMatch: false,
      mustContainNumber: false,
      mustContainUpper: false,
      mustContainLower: false,
      mustBe8Characters: false
    };
  
    console.log('Here is the group: ', formControls);

    if ( password1.length > 0 &&  password2.length > 0
    ) {
      if (password1.length < 8) {
        allTheErrors.mustBe8Characters = true;
      }
      if (password1 !== password2) {
        allTheErrors.newPaswordsMustMatch = true;
      }
      if (!/[0-9]+/.test(password1)) {
        allTheErrors.mustContainNumber = true;
      }
      if (!/[A-Z]+/.test(password1)) {
        allTheErrors.mustContainUpper = true;
      }
      if (!/[a-z]+/.test(password1)) {
        allTheErrors.mustContainLower = true;
      }
    } else {
     return  null;
    }
    return allTheErrors;
  };

}
