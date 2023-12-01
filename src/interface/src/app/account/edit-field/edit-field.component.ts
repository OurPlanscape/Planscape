import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User } from '../../types';
import { take } from 'rxjs';
import { AuthService } from '../../services';

type availableUserFields = keyof Pick<User, 'firstName' | 'lastName'>;

@Component({
  selector: 'app-edit-field',
  templateUrl: './edit-field.component.html',
  styleUrls: ['./edit-field.component.scss'],
})
export class EditFieldComponent {
  @Input() currentValue = '';
  @Input() userField: availableUserFields = 'firstName';
  editing = false;
  disableEditButton = false;
  form: FormGroup;

  readonly labels: Record<availableUserFields, string> = {
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

    this.disableEditButton = true;
    let user: Partial<User> = {};
    user[this.userField] = this.form.get('name')?.value;

    this.authService
      .updateUserName(user)
      .pipe(take(1))
      .subscribe(
        (_) => {
          this.disableEditButton = false;
        },
        (err) => {
          // if (err.status == 401) {
          //   this.error = {
          //     message: 'Your credentials were not entered correctly.',
          //   };
          // } else {
          //   this.error = { message: 'An unexpected error occured.' };
          // }
          this.disableEditButton = false;
        }
      );
  }
}
