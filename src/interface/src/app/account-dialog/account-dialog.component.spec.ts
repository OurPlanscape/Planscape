import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';

import { AuthService } from '../services';
import { User } from './../types/user.types';
import { AccountDialogComponent } from './account-dialog.component';
import { DeleteAccountDialogComponent } from './delete-account-dialog/delete-account-dialog.component';

describe('AccountDialogComponent', () => {
  let component: AccountDialogComponent;
  let fixture: ComponentFixture<AccountDialogComponent>;
  let fakeAuthService: AuthService;

  beforeEach(() => {
    fakeAuthService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      {
        changePassword: of(),
        logout: of(),
        updateUser: of(),
      },
      {
        loggedInUser$: new BehaviorSubject<User | null | undefined>({
          firstName: 'Foo',
          lastName: 'Bar',
          email: 'test@test.com',
        }),
      }
    );
    const fakeDialog = jasmine.createSpyObj(
      'MatDialog',
      {
        open: jasmine.createSpyObj(
          'MatDialogRef',
          {
            afterClosed: of({ deletedAccount: true }),
          },
          {}
        ),
      },
      {}
    );
    const fakeDialogRef = jasmine.createSpyObj(
      'MatDialogRef',
      {
        close: undefined,
      },
      {}
    );
    TestBed.configureTestingModule({
      imports: [FormsModule, MaterialModule, ReactiveFormsModule],
      declarations: [AccountDialogComponent],
      providers: [
        { provide: AuthService, useValue: fakeAuthService },
        {
          provide: MatDialog,
          useValue: fakeDialog,
        },
        {
          provide: MatDialogRef<AccountDialogComponent>,
          useValue: fakeDialogRef,
        },
      ],
    });
    fixture = TestBed.createComponent(AccountDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('can load instance', () => {
    expect(component).toBeTruthy();
  });

  it('logs user out', () => {
    component.logout();

    expect(fakeAuthService.logout).toHaveBeenCalledOnceWith();
  });

  it('editing prefills form and clears error', () => {
    component.error = 'err';

    component.editAccount();

    expect(component.editingAccount).toBeTrue();
    expect(component.error).toBeNull();
    expect(component.editAccountForm.value).toEqual({
      firstName: 'Foo',
      lastName: 'Bar',
      email: 'test@test.com',
      currentPassword: '',
    });
  });

  it('changing password clears error', () => {
    component.error = 'err';

    component.changePassword();

    expect(component.changingPassword).toBeTrue();
    expect(component.error).toBeNull();
  });

  it('saving user changes calls AuthService', () => {
    component.editAccount();
    component.editAccountForm.get('currentPassword')?.setValue('password');
    component.saveEdits();

    expect(fakeAuthService.updateUser).toHaveBeenCalledOnceWith(
      {
        firstName: 'Foo',
        lastName: 'Bar',
        email: 'test@test.com',
      },
      'password'
    );
  });

  it('saving new password calls AuthService', () => {
    component.changePasswordForm.setValue({
      currentPassword: 'password',
      newPassword1: 'TestPass1234',
      newPassword2: 'TestPass1234',
    });

    component.savePassword();

    expect(fakeAuthService.changePassword).toHaveBeenCalledOnceWith(
      'password',
      'TestPass1234',
      'TestPass1234'
    );
  });

  // Password Validations
  it('valid new passwords displays no error', () => {
    component.changePasswordForm.setValue({
      currentPassword: 'someOldPassword',
      newPassword1: 'TestPass1234',
      newPassword2: 'TestPass1234',
    });
    fixture.detectChanges();
    expect(component.changePasswordForm.invalid).toBeFalsy();
    expect(component.changePasswordForm.errors).toBeNull();
  });
  it('a new password matching current password registers an error', () => {
    component.changePasswordForm.setValue({
      currentPassword: 'TestPass1234',
      newPassword1: 'TestPass1234',
      newPassword2: 'TestPass1234',
    });
    fixture.detectChanges();
    expect(component.changePasswordForm.invalid).toBeTruthy();
    expect(component.changePasswordForm.errors).toBeTruthy();
    expect(
      component.changePasswordForm.errors?.['newPasswordMustBeNew']
    ).toBeTrue();
  });
  it('a password without numbers or uppercase letters registers multiple error', () => {
    component.changePasswordForm.setValue({
      currentPassword: 'TestPass1234',
      newPassword1: 'abcdefghi',
      newPassword2: 'abcdefghi',
    });
    fixture.detectChanges();
    expect(component.changePasswordForm.invalid).toBeTruthy();
    expect(component.changePasswordForm.errors).toBeTruthy();
    expect(
      component.changePasswordForm.errors?.['mustContainNumber']
    ).toBeTrue();
    expect(
      component.changePasswordForm.errors?.['mustContainUpper']
    ).toBeTrue();
  });

  it('deleting account opens dialog', () => {
    const dialog = fixture.debugElement.injector.get(MatDialog);
    const router = fixture.debugElement.injector.get(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    component.openDeleteAccountDialog();

    expect(dialog.open).toHaveBeenCalledOnceWith(DeleteAccountDialogComponent, {
      data: {
        user: {
          firstName: 'Foo',
          lastName: 'Bar',
          email: 'test@test.com',
        },
      },
    });
  });

  it('deleting account successfully routes to login', () => {
    const dialogRef = fixture.debugElement.injector.get(
      MatDialogRef<AccountDialogComponent>
    );
    const router = fixture.debugElement.injector.get(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    component.openDeleteAccountDialog();

    expect(dialogRef.close).toHaveBeenCalledOnceWith();
    expect(router.navigate).toHaveBeenCalledOnceWith(['login']);
  });
});
