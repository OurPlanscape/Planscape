import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { AuthService, PasswordResetToken } from '../services';
import { PasswordResetComponent } from './password-reset.component';

describe('PasswordResetComponent - Token is valid', () => {
  let component: PasswordResetComponent;
  let fixture: ComponentFixture<PasswordResetComponent>;
  let fakeAuthService: jasmine.SpyObj<AuthService>;
  
  const fakePasswordResetToken: PasswordResetToken = {
    userId: '1b',
    token: 'token'
  };

  beforeEach(() => {
    const routerStub = () => ({ navigate: (array: string[]) => ({}) });
    fakeAuthService = jasmine.createSpyObj<AuthService>('AuthService', [
      'resetPassword',
    ]);

    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        MatDialogModule,
        NoopAnimationsModule,
      ],
      declarations: [PasswordResetComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: Router, useFactory: routerStub },
        { provide: ActivatedRoute, useValue: { data: of(fakePasswordResetToken) }},
        { provide: AuthService, useValue: fakeAuthService },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PasswordResetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('can load instance', () => {
    const router = fixture.debugElement.injector.get(Router);
    spyOn(router, 'navigate');

    expect(component).toBeTruthy();

    expect(router.navigate).toHaveBeenCalledTimes(0);
  });

  describe('resets password', () => {
    beforeEach(() => {
      component.form.reset();
    });

    it('reset disabled if form is empty', () => {
      component.submit();

      expect(fakeAuthService.resetPassword).toHaveBeenCalledTimes(0);
    });

    it('reset disabled if password less than 8 characters', () => {
      component.form.get('password1')?.setValue('abcdef');
      component.form.get('password2')?.setValue('abcdef');

      component.submit();
      expect(fakeAuthService.resetPassword).toHaveBeenCalledTimes(0);
    });

    it('reset disabled if password does not match', () => {
      component.form.get('password1')?.setValue('abcdefghi');
      component.form.get('password2')?.setValue('aaaaaaaaa');

      component.submit();
      expect(fakeAuthService.resetPassword).toHaveBeenCalledTimes(0);
    });

    it('calls auth service if form is valid', () => {
      fakeAuthService.resetPassword.and.returnValue(of(true));
      component.form.get('password1')?.setValue('abcdefghi')
      component.form.get('password2')?.setValue('abcdefghi')

      component.submit();
      expect(fakeAuthService.resetPassword).toHaveBeenCalledOnceWith(
        '1b', 'token', 'abcdefghi', 'abcdefghi'
      );
    });
  })
});
