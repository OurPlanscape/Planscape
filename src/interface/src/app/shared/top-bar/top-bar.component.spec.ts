import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, of } from 'rxjs';

import { AuthService } from '@services';
import { User } from '@types';
import { TopBarComponent } from './top-bar.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatLegacyMenuHarness as MatMenuHarness } from '@angular/material/legacy-menu/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { LegacyMaterialModule } from '../../material/legacy-material.module';

describe('TopBarComponent', () => {
  let component: TopBarComponent;
  let fixture: ComponentFixture<TopBarComponent>;
  let mockAuthService: Partial<AuthService>;
  let loader: HarnessLoader;

  const guestSelector = '[data-id="login-guest"]';
  const menuSelector = '[data-id="menu-trigger"]';
  let loggedIn$ = new BehaviorSubject(false);

  beforeEach(async () => {
    mockAuthService = {
      loggedInUser$: new BehaviorSubject<User | null | undefined>(null),
      isLoggedIn$: loggedIn$,
      logout: () => of({ detail: '' }),
    };

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        LegacyMaterialModule,
        RouterTestingModule,
        NoopAnimationsModule,
      ],
      declarations: [TopBarComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compileComponents();
  });

  function setUpComponent() {
    fixture = TestBed.createComponent(TopBarComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  }

  it('should create', () => {
    setUpComponent();
    expect(component).toBeTruthy();
  });

  describe('with login enabled ', () => {
    describe('logged out', () => {
      beforeEach(() => loggedIn$.next(false));

      it('should show `Sign In` on the title bar', () => {
        setUpComponent();
        const guestNameEl = fixture.debugElement.query(By.css(guestSelector));
        expect(guestNameEl).toBeFalsy();
        const menuTriggerEl = fixture.debugElement.query(By.css(menuSelector));
        expect(menuTriggerEl.nativeElement.innerHTML.trim()).toEqual('Sign In');
      });
      it('should have a menu with `login` and `create account` options', async () => {
        setUpComponent();
        const harness = await loader.getHarness(MatMenuHarness);
        await harness.open();
        const items = await harness.getItems();

        expect(items.length).toBe(2);

        const loginText = await items[0].getText();
        const createAccountText = await items[1].getText();

        expect(loginText).toBe('Log In');
        expect(createAccountText).toBe('Create Account');
      });
    });

    describe('logged in', () => {
      beforeEach(() => {
        mockAuthService.loggedInUser$?.next({
          firstName: 'Foo',
          username: 'User',
        });
        loggedIn$.next(true);
      });
      it('should show the first name on the title bar', () => {
        setUpComponent();
        const guestNameEl = fixture.debugElement.query(By.css(guestSelector));
        expect(guestNameEl).toBeFalsy();
        const menuTriggerEl = fixture.debugElement.query(By.css(menuSelector));
        expect(menuTriggerEl.nativeElement.innerHTML.trim()).toEqual('Foo');
      });
      it('should have a menu with `plans`, `account`  and `sign out`', async () => {
        setUpComponent();
        const harness = await loader.getHarness(MatMenuHarness);
        await harness.open();
        const items = await harness.getItems();

        expect(items.length).toBe(3);

        const texts = await Promise.all(
          items.map(async (item) => await item.getText())
        );

        expect(texts).toEqual(['Plans', 'Account', 'Sign Out']);
      });
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
});
