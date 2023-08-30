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
      {},
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
      providers: [{ provide: AuthService, useValue: fakeAuthService }],
    });
    fixture = TestBed.createComponent(NavigationComponent);
    component = fixture.componentInstance;
  });

  it('can load instance', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it(`sidebarOpen has default value`, () => {
    fixture.detectChanges();
    expect(component.sidebarOpen).toEqual(false);
  });

  it('should show sidebar if not on new_navigation fflag', () => {
    const service = TestBed.inject(FeatureService);
    spyOn(service, 'isFeatureEnabled').and.returnValue(false);
    fixture.detectChanges();

    const sidebar = fixture.debugElement.query(By.css('.sidenav'));
    expect(sidebar).toBeTruthy();
  });

  it('should not show sidebar if on navigation fflag', () => {
    const service = TestBed.inject(FeatureService);
    spyOn(service, 'isFeatureEnabled').and.returnValue(true);
    fixture.detectChanges();
    const sidebar = fixture.debugElement.query(By.css('.sidenav'));
    expect(sidebar).toBeFalsy();
  });

  it(`isLoggedIn$ has default value`, () => {
    fixture.detectChanges();
    const authServiceStub: AuthService =
      fixture.debugElement.injector.get(AuthService);
    expect(component.isLoggedIn$).toEqual(authServiceStub.isLoggedIn$);
  });

  describe('logout', () => {
    it('makes expected calls', () => {
      fixture.detectChanges();
      const authServiceStub: AuthService =
        fixture.debugElement.injector.get(AuthService);
      component.logout();
      expect(authServiceStub.logout).toHaveBeenCalled();
    });
  });
});
