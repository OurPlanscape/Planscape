import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ActivatedRoute, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { AuthService, PasswordResetToken } from '@services';
import { PasswordResetComponent } from './password-reset.component';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatDialogModule } from '@angular/material/dialog';

describe('PasswordResetComponent', () => {
  let component: PasswordResetComponent;
  let fixture: ComponentFixture<PasswordResetComponent>;
  let fakeAuthService: jasmine.SpyObj<AuthService>;
  const routerStub = () => ({ navigate: (_: string[]) => ({}) });

  beforeEach(() => {
    fakeAuthService = jasmine.createSpyObj<AuthService>('AuthService', [
      'resetPassword',
    ]);
  });

  describe('Token is valid', () => {
    const fakePasswordResetToken: PasswordResetToken = {
      userId: '1b',
      token: 'token',
    };

    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [
          FormsModule,
          ReactiveFormsModule,
          MatDialogModule,
          NoopAnimationsModule,
          MatInputModule,
          PasswordResetComponent,
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          { provide: Router, useFactory: routerStub },
          {
            provide: ActivatedRoute,
            useValue: {
              data: of({ passwordResetToken: fakePasswordResetToken }),
            },
          },
          { provide: AuthService, useValue: fakeAuthService },
        ],
      }).compileComponents();
      fixture = TestBed.createComponent(PasswordResetComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('can load instance', () => {
      const router: Router = fixture.debugElement.injector.get(Router);
      spyOn(router, 'navigate');

      expect(component).toBeTruthy();

      expect(router.navigate).toHaveBeenCalledTimes(0);
    });

    describe('resets password', () => {
      beforeEach(() => {
        component.form.reset();
      });

      it('cancel navigates to login', () => {
        const router = fixture.debugElement.injector.get(Router);
        spyOn(router, 'navigate').and.callThrough();

        component.cancel();

        expect(router.navigate).toHaveBeenCalledOnceWith(['login']);
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
        component.form.get('password1')?.setValue('abcdefghi');
        component.form.get('password2')?.setValue('abcdefghi');

        component.submit();
        expect(fakeAuthService.resetPassword).toHaveBeenCalledOnceWith(
          '1b',
          'token',
          'abcdefghi',
          'abcdefghi'
        );
      });
    });
  });

  describe('Token is not valid', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [
          FormsModule,
          ReactiveFormsModule,
          MatDialogModule,
          NoopAnimationsModule,
          MatInputModule,
          PasswordResetComponent,
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          { provide: Router, useFactory: routerStub },
          {
            provide: ActivatedRoute,
            useValue: { data: of({ passwordResetToken: null }) },
          },
          { provide: AuthService, useValue: fakeAuthService },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(PasswordResetComponent);
    });

    it('navigates to reset page', () => {
      const router = fixture.debugElement.injector.get(Router);
      spyOn(router, 'navigate').and.callThrough();

      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(router.navigate).toHaveBeenCalledOnceWith(['reset']);
    });
  });
});
