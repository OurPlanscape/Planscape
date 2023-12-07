import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services';
import { take } from 'rxjs';
import {
  passwordMustBeNewValidator,
  passwordsMustMatchValidator,
} from '../../validators/passwords';

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
        validators: [
          passwordMustBeNewValidator('current', 'password'),
          passwordsMustMatchValidator('password', 'passwordConfirm'),
        ],
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
