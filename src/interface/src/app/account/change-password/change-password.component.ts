import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '@services';
import { map, take } from 'rxjs';
import {
  passwordMustBeNewValidator,
  passwordsMustMatchValidator,
} from '../../validators/passwords';
import { FormMessageType } from '@types';
import { PasswordStateMatcher } from '../../validators/error-matchers';

type State = 'view' | 'editing' | 'saving';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss'],
})
export class ChangePasswordComponent {
  @Input() currentValue = '';

  @Output() saved = new EventEmitter<string>();
  @Output() failed = new EventEmitter<string>();
  state: State = 'view';
  form: FormGroup;
  error: any;
  success = false;
  username$ = this.authService.loggedInUser$.pipe(
    map((user) => user?.username)
  );

  currentPasswordStateMatcher = new PasswordStateMatcher([]);
  passwordStateMatcher = new PasswordStateMatcher([
    'newPasswordMustBeNew',
    'newPasswordsMustMatch',
  ]);
  confirmPasswordStateMatcher = new PasswordStateMatcher([
    'newPasswordsMustMatch',
  ]);
  showHint = false;

  readonly FormMessageType = FormMessageType;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.form = this.createForm();
  }

  private createForm() {
    return this.fb.group(
      {
        current: this.fb.control('', [Validators.required]),
        newPassword: this.fb.control('', [
          Validators.required,
          Validators.minLength(8),
        ]),
        passwordConfirm: this.fb.control('', [Validators.required]),
      },
      {
        validators: [
          passwordMustBeNewValidator('current', 'newPassword'),
          passwordsMustMatchValidator('newPassword', 'passwordConfirm'),
        ],
      }
    );
  }

  saveForm() {
    if (this.form.invalid) return;
    this.state = 'saving';
    this.error = null;

    const current = this.form.get('current');
    const newPassword = this.form.get('newPassword');
    const passwordConfirm = this.form.get('passwordConfirm');

    this.authService
      .changePassword(
        current?.value,
        newPassword?.value,
        passwordConfirm?.value
      )
      .pipe(take(1))
      .subscribe(
        (_) => {
          this.error = null;
          this.success = true;
          this.state = 'view';
        },
        (err: any) => {
          if (err.error.old_password) {
            current?.setErrors({ invalid: true });
          }
          if (err.error.new_password2) {
            newPassword?.setErrors({ invalid: true });
            passwordConfirm?.setErrors({ invalid: true });
          }
          this.error = Object.values(err.error);
          this.state = 'editing';
        }
      );
  }

  cancel() {
    this.state = 'view';
    this.resetAll();
  }

  edit() {
    this.state = 'editing';
    this.resetAll();
  }

  resetAll() {
    this.error = null;
    this.success = false;
    this.form = this.createForm();
  }
}
