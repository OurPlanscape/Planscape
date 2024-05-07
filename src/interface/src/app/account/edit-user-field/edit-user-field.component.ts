import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User } from '@types';
import { take } from 'rxjs';
import { AuthService } from '@services';

type AvailableUserFields = keyof Pick<User, 'firstName' | 'lastName'>;
type State = 'view' | 'editing' | 'saving' | 'error';

@Component({
  selector: 'app-edit-user-field',
  templateUrl: './edit-user-field.component.html',
  styleUrls: ['./edit-user-field.component.scss'],
})
export class EditUserFieldComponent {
  @Input() currentValue = '';
  @Input() userField: AvailableUserFields = 'firstName';
  @Output() saved = new EventEmitter<string>();
  @Output() failed = new EventEmitter<string>();
  state: State = 'view';
  form: FormGroup;

  readonly labels: Record<AvailableUserFields, string> = {
    firstName: 'First Name',
    lastName: 'Last Name',
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.form = this.fb.group({
      name: this.fb.control('', Validators.required),
    });
  }

  saveForm() {
    if (this.form.invalid) return;
    this.state = 'saving';
    let user: Partial<User> = {};
    user[this.userField] = this.form.get('name')?.value;

    this.authService
      .updateUserInfo(user)
      .pipe(take(1))
      .subscribe(
        (_) => {
          this.state = 'view';
          this.saved.emit(this.labels[this.userField] + ' Changed');
        },
        (err) => {
          this.state = 'error';
          this.failed.emit(err);
        }
      );
  }
}
