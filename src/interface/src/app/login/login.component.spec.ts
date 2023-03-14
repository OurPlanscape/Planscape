import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../services';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(() => {
    const routerStub = () => ({ navigate: (array: string[]) => ({}) });
    const fakeAuthService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      { login: of({}) },
      {}
    );
    TestBed.configureTestingModule({
      imports: [FormsModule],
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [LoginComponent],
      providers: [
        { provide: Router, useFactory: routerStub },
        { provide: AuthService, useValue: fakeAuthService },
      ],
    });
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  });

  it('can load instance', () => {
    expect(component).toBeTruthy();
  });

  describe('onSubmit', () => {
    it('calls login()', () => {
      spyOn(component, 'login').and.callThrough();

      component.onSubmit();

      expect(component.login).toHaveBeenCalled();
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
