import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { take } from 'rxjs';
import { SNACK_NOTICE_CONFIG } from '../../shared/constants';
import { AuthService } from '../../services';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss'],
})
export class DetailsComponent {
  editAccountForm: FormGroup;
  nameForm: FormGroup;
  lastNameForm: FormGroup;
  disableEditButton: boolean = false;

  error: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private snackbar: MatSnackBar
  ) {
    this.editAccountForm = this.fb.group({
      firstName: this.fb.control('', Validators.required),
      lastName: this.fb.control('', Validators.required),
    });
    this.nameForm = this.fb.group({
      firstName: this.fb.control('', Validators.required),
    });
    this.lastNameForm = this.fb.group({
      firstName: this.fb.control('', Validators.required),
    });
  }

  saveFirstName() {}

  saveLastName() {}

  saveEdits(): void {
    if (this.editAccountForm.invalid) return;

    this.disableEditButton = true;

    this.authService
      .updateUser(
        {
          firstName: this.editAccountForm.get('firstName')?.value,
          lastName: this.editAccountForm.get('lastName')?.value,
          email: this.editAccountForm.get('email')?.value,
        },
        this.editAccountForm.get('currentPassword')?.value
      )
      .pipe(take(1))
      .subscribe(
        (_) => {
          this.disableEditButton = false;
          this.error = null;

          this.snackbar.open(
            'Successfully updated password',
            'Dismiss',
            SNACK_NOTICE_CONFIG
          );
        },
        (err) => {
          if (err.status == 401) {
            this.error = {
              message: 'Your credentials were not entered correctly.',
            };
          } else {
            this.error = { message: 'An unexpected error occured.' };
          }
          this.disableEditButton = false;
        }
      );
  }
}
