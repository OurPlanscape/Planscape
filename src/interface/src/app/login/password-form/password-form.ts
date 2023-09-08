import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services';

/**
 * Controls password validation and token fetch
 * for email password reset *
 */
@Component({
  selector: 'app-password-form',
  templateUrl: './password_form.html',
  styleUrls: ['./password_form.css'],
})
export class PasswordForm {
  protected readonly passwordControl = new FormControl('', [
    Validators.required,
  ]);
  protected readonly passwordForm = new FormGroup({
    password: this.passwordControl,
  });

  constructor(
    private readonly authService: AuthService,
  )

  protected onSubmit() {
    const password = this.passwordControl.value as string;

    this.authService
  }
}
