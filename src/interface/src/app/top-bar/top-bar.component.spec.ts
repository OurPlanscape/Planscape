import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';

import { MaterialModule } from '../material/material.module';
import { AuthService, SessionService } from '../services';
import { Region, User } from '../types';
import { AccountDialogComponent } from './../account-dialog/account-dialog.component';
import { TopBarComponent } from './top-bar.component';
import { FeatureService } from '../features/feature.service';
import { FeaturesModule } from '../features/features.module';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

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
      loggedInUser$: new BehaviorSubject<User | null>(null),
    };
    mockSessionService = {
      region$: new BehaviorSubject<Region | null>(null),
      setRegion: () => {},
    };
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MaterialModule, FeaturesModule],
      declarations: [TopBarComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: MatDialog, useValue: fakeMatDialog },
        { provide: SessionService, useValue: mockSessionService },
        {
          provide: FeatureService,
          useValue: { isFeatureEnabled: () => false },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TopBarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('actions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should toggle sidenav', () => {
      spyOn(component.toggleEvent, 'emit');

      // Act: click on the menu icon
      const menuButton = fixture.debugElement.query(
        By.css('[data-testid="menu-button"]')
      );
      const clickEvent = new MouseEvent('click');
      menuButton.triggerEventHandler('click', clickEvent);

      // Assert: expect that the toggleEvent emits the Event
      expect(component.toggleEvent.emit).toHaveBeenCalledOnceWith(clickEvent);
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
      fixture.detectChanges();
    });

    it('should be "Guest" when no user is logged in', () => {
      expect(component.displayName).toEqual('Guest');
    });

    it('should be the first name of the logged in user', () => {
      mockAuthService.loggedInUser$?.next({
        firstName: 'Foo',
        username: 'User',
      });

      expect(component.displayName).toEqual('Foo');
    });

    it('should be the username of the logged in user if they have no first name', () => {
      mockAuthService.loggedInUser$?.next({ username: 'User' });

      expect(component.displayName).toEqual('User');
    });
  });

  describe('feedback button', () => {
    it('should show the feedback button when on new_navigation flag is on', () => {
      const featureService = TestBed.inject(FeatureService);
      spyOn(featureService, 'isFeatureEnabled').and.returnValue(true);
      fixture.detectChanges();
      const feedbackBtn = fixture.debugElement.query(
        By.css('[data-id="feedback"]')
      );
      expect(feedbackBtn).toBeTruthy();
    });
    it('should not show the button when new_navigation flag is off ', () => {
      const featureService = TestBed.inject(FeatureService);
      spyOn(featureService, 'isFeatureEnabled').and.returnValue(false);
      fixture.detectChanges();
      const feedbackBtn = fixture.debugElement.query(
        By.css('[data-id="feedback"]')
      );
      expect(feedbackBtn).toBeFalsy();
    });
  });

  describe('help button', () => {
    it('should not show the help button when on new_navigation flag is on', () => {
      const featureService = TestBed.inject(FeatureService);
      spyOn(featureService, 'isFeatureEnabled').and.returnValue(true);
      fixture.detectChanges();
      const feedbackBtn = fixture.debugElement.query(
        By.css('[data-id="help"]')
      );
      expect(feedbackBtn).toBeFalsy();
    });
    it('should show the help button when new_navigation flag is off ', () => {
      const featureService = TestBed.inject(FeatureService);
      spyOn(featureService, 'isFeatureEnabled').and.returnValue(false);
      fixture.detectChanges();
      const feedbackBtn = fixture.debugElement.query(
        By.css('[data-id="help"]')
      );
      expect(feedbackBtn).toBeTruthy();
    });
  });

  describe('new logo', () => {
    it('should show the new logo when new_navigation flag is on', () => {
      const featureService = TestBed.inject(FeatureService);
      spyOn(featureService, 'isFeatureEnabled').and.returnValue(true);
      fixture.detectChanges();
      const logo = fixture.debugElement.query(By.css('[data-id="logo"]'));
      const title = fixture.debugElement.query(By.css('[data-id="title"]'));
      expect(logo).toBeTruthy();
      expect(title).toBeFalsy();
    });
    it('should show the preview logo when new_navigation flag is off ', () => {
      const featureService = TestBed.inject(FeatureService);
      spyOn(featureService, 'isFeatureEnabled').and.returnValue(false);
      fixture.detectChanges();
      const logo = fixture.debugElement.query(By.css('[data-id="logo"]'));
      const title = fixture.debugElement.query(By.css('[data-id="title"]'));
      expect(logo).toBeFalsy();
      expect(title).toBeTruthy();
    });
  });
});
