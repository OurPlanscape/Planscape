import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';

import { MaterialModule } from '../material/material.module';
import { AuthService, SessionService } from '../services';
import { Region, User } from '../types';
import { AccountDialogComponent } from '../account-dialog/account-dialog.component';
import { TopBarComponent } from './top-bar.component';
import { FeaturesModule } from '../features/features.module';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

describe('TopBarComponent', () => {
  let component: TopBarComponent;
  let fixture: ComponentFixture<TopBarComponent>;
  let mockAuthService: Partial<AuthService>;
  let mockSessionService: Partial<SessionService>;

  beforeEach(async () => {
    const fakeMatDialog = jasmine.createSpyObj<MatDialog>(
      'MatDialog',
      {
        open: undefined,
      },
      {}
    );

    mockAuthService = {
      loggedInUser$: new BehaviorSubject<User | null | undefined>(null),
      isLoggedIn$: new BehaviorSubject(false),
      logout: () => of({ detail: '' }),
    };
    mockSessionService = {
      region$: new BehaviorSubject<Region | null>(null),
      setRegion: () => {},
    };
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        MaterialModule,
        FeaturesModule,
        RouterTestingModule,
      ],
      declarations: [TopBarComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: MatDialog, useValue: fakeMatDialog },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compileComponents();
  });

  function setUpComponent() {
    fixture = TestBed.createComponent(TopBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    setUpComponent();
    expect(component).toBeTruthy();
  });

  describe('actions', () => {
    beforeEach(() => {
      setUpComponent();
    });

    it('should open account dialog', () => {
      const fakeMatDialog: MatDialog =
        fixture.debugElement.injector.get(MatDialog);

      // Act: click on the account icon
      const accountButton = fixture.debugElement.query(
        By.css('[data-testid="account-button"]')
      );
      const clickEvent = new MouseEvent('click');
      accountButton.triggerEventHandler('click', clickEvent);

      // Assert: expect that the dialog opens
      expect(fakeMatDialog.open).toHaveBeenCalledOnceWith(
        AccountDialogComponent
      );
    });
  });

  describe('username', () => {
    beforeEach(() => {
      setUpComponent();
    });

    it('should be "Guest" when no user is logged in', async () => {
      const displayName = await firstValueFrom(component.displayName$);
      expect(displayName).toEqual('Guest');
    });

    it('should be the first name of the logged in user', async () => {
      mockAuthService.loggedInUser$?.next({
        firstName: 'Foo',
        username: 'User',
      });
      const displayName = await firstValueFrom(component.displayName$);
      expect(displayName).toEqual('Foo');
    });

    it('should be the username of the logged in user if they have no first name', async () => {
      mockAuthService.loggedInUser$?.next({ username: 'User' });
      const displayName = await firstValueFrom(component.displayName$);
      expect(displayName).toEqual('User');
    });
  });

  it('should show logo', () => {
    setUpComponent();
    const logo = fixture.debugElement.query(By.css('[data-id="logo"]'));
    const title = fixture.debugElement.query(By.css('[data-id="title"]'));
    expect(logo).toBeTruthy();
    expect(title).toBeFalsy();
  });

  it('should show the feedback button', () => {
    setUpComponent();
    const feedbackBtn = fixture.debugElement.query(
      By.css('[data-id="feedback"]')
    );
    expect(feedbackBtn).toBeTruthy();
  });

  describe('logout', () => {
    it('should log out user and redirect', () => {
      setUpComponent();
      const auth = TestBed.inject(AuthService);
      const router = TestBed.inject(Router);
      spyOn(router, 'navigate');
      spyOn(auth, 'logout').and.callThrough();

      component.logout();

      expect(auth.logout).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  /// display name is
  // guest when no login flag
  // sign in if not logged in
  // name if logged in
});
