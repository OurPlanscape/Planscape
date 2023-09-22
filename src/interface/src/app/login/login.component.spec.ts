import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { BehaviorSubject, of } from 'rxjs';

import { AuthService } from '../services';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let fakeAuthService: jasmine.SpyObj<AuthService>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    const routerStub = () => ({ navigate: (array: string[]) => ({}) });
    fakeAuthService = jasmine.createSpyObj<AuthService>('AuthService', [
      'login',
    ]);
    TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule],
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

  it('forget password navigates to reset', async () => {
    const routerStub: Router = fixture.debugElement.injector.get(Router);
    spyOn(routerStub, 'navigate').and.callThrough();

    const forgetPasswordLink: HTMLElement = fixture.debugElement.query(
      By.css('.forget-password-link')
    ).nativeElement;

    expect(forgetPasswordLink.getAttribute('href')).toEqual('reset/');
  });
});
