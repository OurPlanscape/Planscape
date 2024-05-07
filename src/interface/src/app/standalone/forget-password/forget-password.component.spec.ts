import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject } from 'rxjs';

import { AuthService } from '@services';
import { ForgetPasswordComponent } from './forget-password.component';

describe('ForgetPasswordComponent', () => {
  let component: ForgetPasswordComponent;
  let fixture: ComponentFixture<ForgetPasswordComponent>;
  let fakeAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const routerStub = () => ({ navigate: (array: string[]) => ({}) });
    fakeAuthService = jasmine.createSpyObj<AuthService>('AuthService', [
      'sendPasswordResetEmail',
    ]);
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        MatDialogModule,
        NoopAnimationsModule,
        ForgetPasswordComponent,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: Router, useFactory: routerStub },
        { provide: AuthService, useValue: fakeAuthService },
      ],
    });

    fixture = TestBed.createComponent(ForgetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('can load instance', () => {
    expect(component).toBeTruthy();
  });

  describe('send reset email', () => {
    beforeEach(() => {
      component.form.reset();
    });

    it('reset disabled if form is invalid', () => {
      component.submit();

      expect(fakeAuthService.sendPasswordResetEmail).toHaveBeenCalledTimes(0);
    });

    it('calls auth service if form is valid', () => {
      component.form.get('email')?.setValue('test@test.com');

      const successEmitter = new BehaviorSubject<any>({});
      fakeAuthService.sendPasswordResetEmail.and.returnValue(successEmitter);

      component.submit();

      expect(fakeAuthService.sendPasswordResetEmail).toHaveBeenCalledOnceWith(
        'test@test.com'
      );
    });
  });
});
