import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, of } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';

import { AuthService } from '../services';
import { User } from './../types/user.types';
import { AccountDialogComponent } from './account-dialog.component';

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
        loggedInUser$: new BehaviorSubject<User | null>({
          firstName: 'Foo',
          lastName: 'Bar',
          email: 'test@test.com',
        }),
      }
    );
    TestBed.configureTestingModule({
      imports: [FormsModule, MaterialModule, ReactiveFormsModule],
      declarations: [AccountDialogComponent],
      providers: [{ provide: AuthService, useValue: fakeAuthService }],
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
    component.saveEdits();

    expect(fakeAuthService.updateUser).toHaveBeenCalledOnceWith({
      firstName: 'Foo',
      lastName: 'Bar',
      email: 'test@test.com',
    });
  });

  it('saving new password calls AuthService', () => {
    component.changePasswordForm.setValue({
      password1: 'testpass',
      password2: 'testpass',
    });

    component.savePassword();

    expect(fakeAuthService.changePassword).toHaveBeenCalledOnceWith(
      'testpass',
      'testpass'
    );
  });
});
