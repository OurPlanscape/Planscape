import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../services';
import { take } from 'rxjs';

type State = 'view' | 'editing' | 'saving' | 'error';

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

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.form = this.fb.group(
      {
        current: this.fb.control('', [Validators.required]),
        password: this.fb.control('', [
          Validators.required,
          Validators.minLength(8),
        ]),
        passwordConfirm: this.fb.control('', [Validators.required]),
      },
      {
        validators: [crossFieldValidators],
      }
    );
  }

  saveForm() {
    if (this.form.invalid) return;
    this.state = 'saving';

    this.authService
      .changePassword(
        this.form.get('current')?.value,
        this.form.get('password')?.value,
        this.form.get('passwordConfirm')?.value
      )
      .pipe(take(1))
      .subscribe(
        (_) => {
          this.error = null;
          // show success
          // this.snackbar.open(
          //   'Updated password successfully',
          //   'Dismiss',
          //   SNACK_NOTICE_CONFIG
          // );
          this.state = 'view';
        },
        (err: any) => {
          this.error = Object.values(err.error);
          this.state = 'error';
        }
      );
  }
}

// duplicated from AccountDialogComponent (component to be deleted)
const crossFieldValidators: ValidatorFn = (
  formControls: AbstractControl
): ValidationErrors | null => {
  const currentPassword = formControls.value.current;
  const password1 = formControls.value.password;
  const password2 = formControls.value.passwordConfirm;

  const allTheErrors = {
    newPasswordMustBeNew: false,
    newPaswordsMustMatch: false,
    mustContainNumber: false,
    mustContainUpper: false,
    mustContainLower: false,
  };

  if (
    currentPassword.length > 0 &&
    password1.length > 0 &&
    password2.length > 0
  ) {
    if (currentPassword === password1) {
      allTheErrors.newPasswordMustBeNew = true;
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
  }
  if (Object.entries(allTheErrors).some(([key, value]) => value !== false)) {
    return allTheErrors;
  }
  return null;
};
