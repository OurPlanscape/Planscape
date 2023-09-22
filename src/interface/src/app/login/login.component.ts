import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../services';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  protected accountError = '';

  form: FormGroup;

  readonly text1: string = `
    Planscape is a collaborative effort by the California Natural Resources Agency (CNRA) and the
    USDA Forest Service, with support from Google.org.
  `;

  constructor(
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private router: Router,
  ) {
    this.form = this.formBuilder.group({
      email: this.formBuilder.control('', [
        Validators.required,
        Validators.email,
      ]),
      password: this.formBuilder.control('', Validators.required),
    });
  }

  login() {
    if (!this.form.valid) return;

    const email: string = this.form.get('email')?.value;
    const password: string = this.form.get('password')?.value;

    this.authService.login(email, password).subscribe(
      (_) => this.router.navigate(['map']),
      (error) => (this.accountError = error.error)
    );
  }

  signup() {
    this.router.navigate(['signup']);
  }

  continueAsGuest() {
    this.router.navigate(['home']);
  }
}
