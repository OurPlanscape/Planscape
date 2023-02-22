import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';

import { FeaturesModule } from '../features/features.module';
import { AuthService } from '../services';
import { NavigationComponent } from './navigation.component';

describe('NavigationComponent', () => {
  let component: NavigationComponent;
  let fixture: ComponentFixture<NavigationComponent>;
  let fakeLoggedInStatus: Subject<boolean>;

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
      providers: [{ provide: AuthService, useValue: fakeAuthService }],
    });
    fixture = TestBed.createComponent(NavigationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('can load instance', () => {
    expect(component).toBeTruthy();
  });

  it(`sidebarOpen has default value`, () => {
    expect(component.sidebarOpen).toEqual(false);
  });

  it(`isLoggedIn$ has default value`, () => {
    const authServiceStub: AuthService =
      fixture.debugElement.injector.get(AuthService);
    expect(component.isLoggedIn$).toEqual(authServiceStub.isLoggedIn$);
  });

  describe('logout', () => {
    it('makes expected calls', () => {
      const authServiceStub: AuthService =
        fixture.debugElement.injector.get(AuthService);
      component.logout();
      expect(authServiceStub.logout).toHaveBeenCalled();
    });
  });
});
