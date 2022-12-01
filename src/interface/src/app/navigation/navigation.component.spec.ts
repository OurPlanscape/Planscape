import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of, Subject } from 'rxjs';

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
        logout: of({}),
      },
      {},
    );
    fakeLoggedInStatus = new BehaviorSubject(true);
    fakeAuthService.isLoggedIn$ = fakeLoggedInStatus;
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [NavigationComponent],
      providers: [{ provide: AuthService, useValue: fakeAuthService }]
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
    const authServiceStub: AuthService = fixture.debugElement.injector.get(
      AuthService
    );
    expect(component.isLoggedIn$).toEqual(authServiceStub.isLoggedIn$);
  });

  describe('logout', () => {
    it('makes expected calls', () => {
      const authServiceStub: AuthService = fixture.debugElement.injector.get(
        AuthService
      );
      component.logout();
      expect(authServiceStub.logout).toHaveBeenCalled();
    });
  });
});
