import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '@services';
import { map, take } from 'rxjs';
import {
  passwordMustBeNewValidator,
  passwordsMustMatchValidator,
} from '@validators/passwords';
import { FormMessageType } from '@types';
import { PasswordStateMatcher } from '@validators/error-matchers';
import { FeatureService } from '@features/feature.service';
import { MIN_PASSWORD_LENGTH } from '@shared';

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
  MIN_PASSWORD_LENGTH = MIN_PASSWORD_LENGTH;
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
    private authService: AuthService,
    private featureService: FeatureService
  ) {
    this.form = this.createForm();
  }

  private createForm() {
    return this.fb.group(
      {
        current: this.fb.control('', [Validators.required]),
        newPassword: this.fb.control('', [
          Validators.required,
          Validators.minLength(MIN_PASSWORD_LENGTH),
        ]),
        passwordConfirm: this.fb.control('', [Validators.required]),
      },
      {
        validators: [
          passwordMustBeNewValidator('current', 'newPassword'),
          passwordsMustMatchValidator('newPassword', 'passwordConfirm'),
        ],
        updateOn: 'blur',
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
          if (
            this.featureService.isFeatureEnabled('CUSTOM_EXCEPTION_HANDLER')
          ) {
            if (err.error.errors.old_password) {
              current?.setErrors({ invalid: true });
            }
            if (err.error.errors.new_password2) {
              newPassword?.setErrors({ invalid: true });
              passwordConfirm?.setErrors({ invalid: true });
            }
            // set the text in the error UI to the actual BE error text
            this.error = Object.values(err.error.errors);
          } else {
            if (err.error.old_password) {
              current?.setErrors({ invalid: true });
            }
            if (err.error.new_password2) {
              newPassword?.setErrors({ invalid: true });
              passwordConfirm?.setErrors({ invalid: true });
            }
            this.error = Object.values(err.error);
          }
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
