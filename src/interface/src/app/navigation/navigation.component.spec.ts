import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';

import { FeaturesModule } from '../features/features.module';
import { AuthService } from '../services';
import { NavigationComponent } from './navigation.component';
import { FeatureService } from '../features/feature.service';
import { By } from '@angular/platform-browser';
import { FEATURES_JSON } from '../features/features-config';

describe('NavigationComponent', () => {
  let component: NavigationComponent;
  let fixture: ComponentFixture<NavigationComponent>;
  let fakeLoggedInStatus: Subject<boolean>;
  let hasFlag = false;

  beforeEach(() => {
    const fakeAuthService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      {
        logout: of({ detail: '' }),
      },
      {}
    );
    fakeLoggedInStatus = new BehaviorSubject(true);
    fakeAuthService.isLoggedIn$ = fakeLoggedInStatus;
    TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        FeaturesModule,
        MaterialModule,
        RouterTestingModule,
      ],
      declarations: [NavigationComponent],
      providers: [
        { provide: AuthService, useValue: fakeAuthService },
        { provide: FEATURES_JSON, useValue: { login: false } },
      ],
    });
  });

  function setUpComponent() {
    fixture = TestBed.createComponent(NavigationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('can load instance', () => {
    setUpComponent();
    expect(component).toBeTruthy();
  });

  it(`sidebarOpen has default value`, () => {
    setUpComponent();
    expect(component.sidebarOpen).toEqual(false);
  });

  it('should show sidebar if not on login fflag', () => {
    setUpComponent();
    const sidebar = fixture.debugElement.query(By.css('.sidenav'));
    expect(sidebar).toBeTruthy();
  });

  it('should not show sidebar if on navigation fflag', () => {
    TestBed.overrideProvider(FEATURES_JSON, {
      useValue: { login: true },
    });
    setUpComponent();
    const sidebar = fixture.debugElement.query(By.css('.sidenav'));
    expect(sidebar).toBeFalsy();
  });

  it(`isLoggedIn$ has default value`, () => {
    setUpComponent();
    const authServiceStub: AuthService =
      fixture.debugElement.injector.get(AuthService);
    expect(component.isLoggedIn$).toEqual(authServiceStub.isLoggedIn$);
  });

  describe('logout', () => {
    it('makes expected calls', () => {
      setUpComponent();
      const authServiceStub: AuthService =
        fixture.debugElement.injector.get(AuthService);
      component.logout();
      expect(authServiceStub.logout).toHaveBeenCalled();
    });
  });
});
