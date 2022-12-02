import { of, BehaviorSubject, Subject } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AuthService } from '../services';
import { AccountDialogComponent } from './account-dialog.component';

describe('AccountDialogComponent', () => {
  let component: AccountDialogComponent;
  let fixture: ComponentFixture<AccountDialogComponent>;
  let fakeLoggedInStatus: Subject<boolean>;

  beforeEach(() => {
    const fakeAuthService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      {
        getLoggedInUser: of({ username: 'username' }),
      },
      {},
    );
    fakeLoggedInStatus = new BehaviorSubject(true);
    fakeAuthService.isLoggedIn$ = fakeLoggedInStatus;
    TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [AccountDialogComponent],
      providers: [{ provide: AuthService, useValue: fakeAuthService }]
    });
    fixture = TestBed.createComponent(AccountDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('can load instance', () => {
    expect(component).toBeTruthy();
  });

  it('updates user observable when logged in status changes to false', (done) => {
    fakeLoggedInStatus.next(false);
    component.user$.subscribe(user => {
      expect(user).toEqual({ username: 'Guest' });
      done();
    });
  });

  it('updates user observable when logged in status changes to true', (done) => {
    fakeLoggedInStatus.next(true);
    component.user$.subscribe(user => {
      expect(user).toEqual({ username: 'username' });
      done();
    });
  });
});
