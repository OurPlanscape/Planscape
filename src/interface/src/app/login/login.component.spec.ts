import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../services';
import { LoginComponent } from './login.component';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

/**
 * Reset Password Data Mock
 */
const EMAIL_DATA_MOCK = {
  message: '',
};

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let fakeAuthService: AuthService;

  beforeEach(() => {
    const routerStub = () => ({ navigate: (array: string[]) => ({}) });
    fakeAuthService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      { login: of({}) },
      {}
    );
    TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule, MatDialogModule,],
      declarations: [LoginComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: Router, useFactory: routerStub },
        { provide: AuthService, useValue: fakeAuthService },
        {provide: MAT_DIALOG_DATA, useFactory: () => EMAIL_DATA_MOCK},
      
      ],
    });
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  });

  it('can load instance', () => {
    expect(component).toBeTruthy();
  });

  describe('login', () => {
    it('login is disabled if form is invalid', () => {
      component.login();

      expect(fakeAuthService.login).toHaveBeenCalledTimes(0);
    });

    it('calls auth service if form is valid', () => {
      component.form.get('email')?.setValue('test@test.com');
      component.form.get('password')?.setValue('password');

      component.login();

      expect(fakeAuthService.login).toHaveBeenCalledOnceWith(
        'test@test.com',
        'password'
      );
    });
  });

  describe('signup', () => {
    it('navigates to signup page', () => {
      const routerStub: Router = fixture.debugElement.injector.get(Router);
      spyOn(routerStub, 'navigate').and.callThrough();

      component.signup();

      expect(routerStub.navigate).toHaveBeenCalledOnceWith(['signup']);
    });
  });

  describe('continue as guest', () => {
    it('navigates to home page', () => {
      const routerStub: Router = fixture.debugElement.injector.get(Router);
      spyOn(routerStub, 'navigate').and.callThrough();

      component.continueAsGuest();

      expect(routerStub.navigate).toHaveBeenCalledOnceWith(['home']);
    });
  });
});
