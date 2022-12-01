import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../services';
import { SignupComponent } from './signup.component';

describe('SignupComponent', () => {
  let component: SignupComponent;
  let fixture: ComponentFixture<SignupComponent>;

  beforeEach(() => {
    const routerStub = () => ({ navigate: (array: string[]) => ({}) });
    const fakeAuthService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      { signup: of({}) },
      {},
    );
    TestBed.configureTestingModule({
      imports: [FormsModule],
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [SignupComponent],
      providers: [
        { provide: Router, useFactory: routerStub },
        { provide: AuthService, useValue: fakeAuthService }
      ]
    });
    fixture = TestBed.createComponent(SignupComponent);
    component = fixture.componentInstance;
  });

  it('can load instance', () => {
    expect(component).toBeTruthy();
  });

  describe('onSubmit', () => {
    it('calls signup()', () => {
      spyOn(component, 'signup').and.callThrough();

      component.onSubmit();

      expect(component.signup).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('navigates to login page', () => {
      const routerStub: Router = fixture.debugElement.injector.get(Router);
      spyOn(routerStub, 'navigate').and.callThrough();

      component.login();

      expect(routerStub.navigate).toHaveBeenCalled();
    });
  });
});
