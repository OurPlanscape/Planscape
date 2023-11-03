import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Observable, take } from 'rxjs';

import { AuthService } from '../../services';
import { User } from '../../types';

@Component({
  selector: 'app-edit-account',
  templateUrl: './edit-account.component.html',
  styleUrls: ['./edit-account.component.scss']
})
export class EditAccountComponent implements OnInit {
  editAccountForm: FormGroup;
  error: any;
  editingAccount: boolean = false;
  disableEditButton: boolean = false;
  user$!: Observable<User | null | undefined>;


  constructor(private authService: AuthService,
    private dialog: MatDialog,
    //private dialogRef: MatDialogRef<AccountDialogComponent>,
    private fb: FormBuilder,
    private router: Router,
    private snackbar: MatSnackBar) { 

      this.editAccountForm = this.fb.group({
        firstName: this.fb.control('', Validators.required),
        lastName: this.fb.control('', Validators.required),
        email: this.fb.control('', [Validators.required, Validators.email]),
        currentPassword: this.fb.control('', [Validators.required]),
      });

    }

    ngOnInit(): void {
      this.user$ = this.authService.loggedInUser$;
    }

    editAccount(): void {
      const user = this.authService.loggedInUser$.getValue();
      this.editAccountForm.get('firstName')?.setValue(user?.firstName);
      this.editAccountForm.get('lastName')?.setValue(user?.lastName);
      this.editAccountForm.get('email')?.setValue(user?.email);
      this.editingAccount = true;
      this.error = null;
    }

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
            this.editingAccount = false;
            this.disableEditButton = false;
            this.error = null;
  
            this.snackbar.open('Successfully updated password', undefined, {
              duration: 6000,
            });
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
