import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { AuthService } from '../services';
import { LoginComponent } from './login.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonHarness } from '@angular/material/button/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let fakeAuthService: jasmine.SpyObj<AuthService>;
  let forgotPasswordButton: MatButtonHarness;
  let loader: HarnessLoader;

  let dialogSpy: jasmine.Spy;
  let dialogRefSpyObj = jasmine.createSpyObj({
    afterClosed: of({}),
    close: null,
  });
  dialogRefSpyObj.componentInstance = { body: '' }; // attach componentInstance to the spy object...

  beforeEach(async () => {
    const routerStub = () => ({ navigate: (array: string[]) => ({}) });
    fakeAuthService = jasmine.createSpyObj<AuthService>('AuthService', [
      'login',
      'sendPasswordResetEmail',
    ]);
    TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule, MatDialogModule],
      declarations: [LoginComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: Router, useFactory: routerStub },
        { provide: AuthService, useValue: fakeAuthService },
      ],
    });
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    forgotPasswordButton = await loader.getHarness(
      MatButtonHarness.with({ text: 'Forgot password' })
    );
  });

  beforeEach(() => {
    dialogSpy = spyOn(TestBed.get(MatDialog), 'open').and.returnValue(
      dialogRefSpyObj
    );
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

      const successEmitter = new BehaviorSubject<any>({});

      fakeAuthService.login.and.returnValue(successEmitter);

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

  it('reset password succeeds', async () => {
    const successEmitter = new BehaviorSubject<void>(undefined);

    fakeAuthService.sendPasswordResetEmail.and.returnValue(successEmitter);

    await forgotPasswordButton.click();
    successEmitter.subscribe((o) => {
      expect(o).toBe(undefined);
    });
    expect(dialogSpy).toHaveBeenCalled();
  });
});
