import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';

import { AuthService } from '@services';
import { LoginComponent } from './login.component';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { Location } from '@angular/common';
import { LegacyMaterialModule } from '../../material/legacy-material.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@Component({
  template: '',
})
class DummyComponent {}

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let fakeAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    fakeAuthService = jasmine.createSpyObj<AuthService>('AuthService', [
      'login',
    ]);
    TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        FormsModule,
        ReactiveFormsModule,
        LegacyMaterialModule,
        BrowserAnimationsModule,
        RouterTestingModule.withRoutes([
          { path: 'home', component: DummyComponent },
          { path: 'map', component: DummyComponent },
          { path: 'signup', component: DummyComponent },
        ]),
      ],
      declarations: [],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [{ provide: AuthService, useValue: fakeAuthService }],
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
      fakeAuthService.login.and.returnValue(of('home'));
      const router = TestBed.inject(Router);
      spyOn(router, 'navigate');
      component.login();

      expect(fakeAuthService.login).toHaveBeenCalledOnceWith(
        'test@test.com',
        'password'
      );
    });

    it('redirects to `home` if login successful', () => {
      const router = TestBed.inject(Router);
      spyOn(router, 'navigate');
      component.form.get('email')?.setValue('test@test.com');
      component.form.get('password')?.setValue('password');
      fakeAuthService.login.and.returnValue(of('home'));
      component.login();
      expect(router.navigate).toHaveBeenCalledOnceWith(['home']);
    });
  });

  describe('signup', () => {
    it('navigates to signup page', () => {
      const routerStub: Router = fixture.debugElement.injector.get(Router);
      spyOn(routerStub, 'navigate');

      component.signup();

      expect(routerStub.navigate).toHaveBeenCalledOnceWith(['signup']);
    });
  });

  describe('explore', () => {
    it('navigates to map', async () => {
      fixture.detectChanges();
      const button = fixture.debugElement.query(By.css('[data-id="explore"]'));
      await button.nativeElement.click();

      // check current URL
      const location = TestBed.inject(Location);
      fixture.detectChanges();
      expect(location.path()).toEqual('/map');
    });
  });
  describe('create account', () => {
    it('navigates to signup', async () => {
      fixture.detectChanges();
      const button = fixture.debugElement.query(
        By.css('[data-id="create-account"]')
      );
      await button.nativeElement.click();

      // check current URL
      const location = TestBed.inject(Location);
      fixture.detectChanges();
      expect(location.path()).toEqual('/signup');
    });
  });

  it('forget password navigates to reset', async () => {
    const routerStub: Router = fixture.debugElement.injector.get(Router);
    spyOn(routerStub, 'navigate');

    const forgetPasswordLink: HTMLElement = fixture.debugElement.query(
      By.css('.forget-password-link')
    ).nativeElement;

    expect(forgetPasswordLink.getAttribute('href')).toEqual('reset/');
  });
});
