import { Component, OnDestroy } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import {of, Subject} from 'rxjs';
import {catchError, takeUntil} from 'rxjs/operators';

import { AuthService } from './../services';
import {ValidationEmailDialog} from './validation-email-dialog/validation-email-dialog.component';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent implements OnDestroy {
  error: any;

  form: FormGroup;
  submitted: boolean = false;
  private readonly destroyed = new Subject<void>();

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }

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

    this.submitted = true;
    const email: string = this.form.get('email')?.value;
    const password1: string = this.form.get('password1')?.value;
    const password2: string = this.form.get('password2')?.value;
    const firstName: string = this.form.get('firstName')?.value;
    const lastName: string = this.form.get('lastName')?.value;
    this.authService
      .signup(email, password1, password2, firstName, lastName)
      .pipe(
        takeUntil(this.destroyed),
        catchError((error: Error) => {
          this.error = error;
          this.submitted = false;
          return of({});
        }
      ))
      .subscribe(
        (_) => {
          this.router.navigate(['home']);
          this.dialog.open(ValidationEmailDialog);
        }
      );
  }

  private passwordsMatchValidator(group: AbstractControl) {
    const password1 = group.get('password1')?.value;
    const password2 = group.get('password2')?.value;
    return password1 === password2 ? null : { passwordsNotEqual: true };
  }
}
