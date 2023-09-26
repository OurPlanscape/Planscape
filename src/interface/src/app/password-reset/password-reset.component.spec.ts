import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';

import { AuthService, PasswordResetToken } from '../services';
import { PasswordResetComponent } from './password-reset.component';

describe('PasswordResetComponent - Token is valid', () => {
  let component: PasswordResetComponent;
  let fixture: ComponentFixture<PasswordResetComponent>;
  let fakeAuthService: jasmine.SpyObj<AuthService>;
  // const fakeActivatedRoute: ActivatedRoute = ({ data: of({ userId: '1b', token: 'token' } as PasswordResetToken) } as any);
  let fakePasswordResetToken: BehaviorSubject<PasswordResetToken>;

  beforeEach(async () => {
    const routerStub = () => ({ navigate: (array: string[]) => ({}) });
    fakeAuthService = jasmine.createSpyObj<AuthService>('AuthService', [
      'resetPassword',
    ]);

    fakePasswordResetToken = new BehaviorSubject({
      userId: '1b',
      token: 'token'
    } as PasswordResetToken);

    // const fakePasswordResetToken = of({
    //   userId: '1b',
    //   token: 'token'
    // } as PasswordResetToken);

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
        { provide: ActivatedRoute, useValue: { data: fakePasswordResetToken } },
        { provide: Router, useFactory: routerStub },
        { provide: AuthService, useValue: fakeAuthService },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
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
      component.form.get('password1')?.setValue('abcdefghi')
      component.form.get('password2')?.setValue('abcdefghi')

      component.submit();
      expect(fakeAuthService.resetPassword).toHaveBeenCalledOnceWith(
        '1b', 'token', 'abcdefghi', 'abcdefghi'
      );
    });
  })
});
