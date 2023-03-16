import { Component } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from './../services';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent {
  error: any;

  form: FormGroup;
  step: number = 0;
  submitted: boolean = false;

  constructor(
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.form = this.formBuilder.group(
      {
        firstName: this.formBuilder.control('', Validators.required),
        lastName: this.formBuilder.control('', Validators.required),
        department: this.formBuilder.control(''),
        username: this.formBuilder.control('', [Validators.required]),
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
    const username: string = this.form.get('username')?.value;
    const email: string = this.form.get('email')?.value;
    const password1: string = this.form.get('password1')?.value;
    const password2: string = this.form.get('password2')?.value;
    this.authService.signup(username, email, password1, password2).subscribe(
      (_) => this.router.navigate(['map']),
      (error) => {
        this.error = error;
        this.submitted = false;
      }
    );
  }

  login() {
    this.router.navigate(['login']);
  }

  enableContinue(): boolean {
    return !!(
      this.form.get('firstName')?.valid && this.form.get('lastName')?.valid
    );
  }

  private passwordsMatchValidator(group: AbstractControl) {
    const password1 = group.get('password1')?.value;
    const password2 = group.get('password2')?.value;
    return password1 === password2 ? null : { passwordsNotEqual: true };
  }
}
