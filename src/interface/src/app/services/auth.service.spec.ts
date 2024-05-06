import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { of, throwError } from 'rxjs';
import { User } from '@types';
import { AuthGuard, AuthService } from './auth.service';
import { RedirectService } from './redirect.service';
import { MockProvider } from 'ng-mocks';
import { environment } from 'src/environments/environment';

describe('AuthService', () => {
  let httpTestingController: HttpTestingController;
  let service: AuthService;

  beforeEach(() => {
    const cookieServiceStub = () => ({ get: (string: string) => ({}) });
    const snackbarSpy = jasmine.createSpyObj<MatSnackBar>(
      'MatSnackBar',
      {
        open: undefined,
      },
      {}
    );
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        MockProvider(RedirectService),
        { provide: CookieService, useFactory: cookieServiceStub },
        {
          provide: MatSnackBar,
          useValue: snackbarSpy,
        },
      ],
    });
    service = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  it('can load instance', () => {
    expect(service).toBeTruthy();
  });

  it(`isLoggedIn$ has default value`, () => {
    expect(service.isLoggedIn$).toEqual(service.loggedInStatus$);
  });

  describe('login', () => {
    it('makes request to backend /login endpoint', (done) => {
      const mockResponse = {
        accessToken: 'test',
      };

      service.login('email', 'password').subscribe((res) => {
        expect(res).toEqual('home');
        done();
      });

      const req = httpTestingController.expectOne(
        environment.backend_endpoint + '/dj-rest-auth/login/'
      );
      expect(req.request.method).toEqual('POST');
      req.flush(mockResponse);
      httpTestingController
        .expectOne(environment.backend_endpoint + '/dj-rest-auth/user/')
        .flush({ email: 'test@test.com' });
      httpTestingController.verify();
    });

    it('should return redirect url if saved on redirectService', () => {
      const redirectService = TestBed.inject(RedirectService);
      const url = 'path/to/somewhere';
      spyOn(redirectService, 'shouldRedirect').and.returnValue(url);
      service.login('email', 'password').subscribe((res) => {
        expect(res).toEqual(url);
      });
      const req = httpTestingController.expectOne(
        environment.backend_endpoint + '/dj-rest-auth/login/'
      );
      req.flush('');
    });

    it('should clear out redirect service', () => {
      const redirectService = TestBed.inject(RedirectService);
      const url = 'path/to/somewhere';
      spyOn(redirectService, 'shouldRedirect').and.returnValue(url);
      spyOn(redirectService, 'removeRedirect');
      service.login('email', 'password').subscribe((res) => {
        expect(redirectService.removeRedirect).toHaveBeenCalled();
      });
      const req = httpTestingController.expectOne(
        environment.backend_endpoint + '/dj-rest-auth/login/'
      );
      req.flush('');
    });

    it('if successful, updates logged in status to true', (done) => {
      const mockResponse = {
        accessToken: 'test',
      };

      service.login('email', 'password').subscribe((_) => {
        expect(service.loggedInStatus$.value).toBeTrue();
        done();
      });

      const req = httpTestingController.expectOne(
        environment.backend_endpoint + '/dj-rest-auth/login/'
      );
      req.flush(mockResponse);
    });

    it('if unsuccessful, does not update logged in status', (done) => {
      service.login('email', 'password').subscribe(
        (_) => {},
        (_) => {
          expect(service.loggedInStatus$.value).toBeNull();
          done();
        }
      );

      const req = httpTestingController.expectOne(
        environment.backend_endpoint + '/dj-rest-auth/login/'
      );
      req.flush('Unsuccessful', { status: 400, statusText: 'Bad request' });
    });

    it('if successful, makes request to backend /user endpoint', (done) => {
      const mockResponse = {
        accessToken: 'test',
      };
      const mockUser = {
        email: 'test@test.com',
      };

      service.login('email', 'password').subscribe((_) => {
        expect(service.loggedInStatus$.value).toBeTrue();
        done();
      });

      const req1 = httpTestingController.expectOne(
        environment.backend_endpoint + '/dj-rest-auth/login/'
      );
      req1.flush(mockResponse);

      const req2 = httpTestingController.expectOne(
        environment.backend_endpoint + '/dj-rest-auth/user/'
      );
      req2.flush(mockUser);
    });

    it('if unsuccessful, does not make request to backend /user endpoint', (done) => {
      service.login('email', 'password').subscribe(
        (_) => {
          expect(service.loggedInStatus$.value).toBeNull();
          done();
        },
        (_) => {
          expect(service.loggedInStatus$.value).toBeNull();
          done();
        }
      );

      const req = httpTestingController.expectOne(
        environment.backend_endpoint + '/dj-rest-auth/login/'
      );
      req.flush('Unsuccessful', { status: 400, statusText: 'Bad request' });
      httpTestingController.verify();
    });
  });

  describe('signup', () => {
    it('if successful, does not make a call to the backend login/ endpoint', (done) => {
      const mockResponse = {
        accessToken: 'test',
      };

      service
        .signup('email', 'password1', 'password2', 'Foo', 'Bar')
        .subscribe((_) => {
          expect(service.loggedInStatus$.value).toBeNull();
          done();
        });

      const req1 = httpTestingController.expectOne(
        environment.backend_endpoint + '/dj-rest-auth/registration/'
      );
      req1.flush(mockResponse);
    });

    it('if should redirect, set redirection with email', (done) => {
      const mockResponse = {
        accessToken: 'test',
      };

      const redirectService = TestBed.inject(RedirectService);
      spyOn(redirectService, 'shouldRedirect').and.returnValue('some/url');
      spyOn(redirectService, 'setRedirect');

      service
        .signup('email', 'password1', 'password2', 'Foo', 'Bar')
        .subscribe((_) => {
          expect(redirectService.setRedirect).toHaveBeenCalled();
          done();
        });

      const req1 = httpTestingController.expectOne(
        environment.backend_endpoint + '/dj-rest-auth/registration/'
      );
      req1.flush(mockResponse);
    });

    it('if unsuccessful, does not make request to backend /login endpoint', (done) => {
      service.signup('email', 'password1', 'password2', 'Foo', 'Bar').subscribe(
        (_) => {},
        (_) => {
          expect(service.loggedInStatus$.value).toBeNull();
          done();
        }
      );

      const req = httpTestingController.expectOne(
        environment.backend_endpoint + '/dj-rest-auth/registration/'
      );
      req.flush('Unsuccessful', { status: 400, statusText: 'Bad request' });
      httpTestingController.verify();
    });
  });

  describe('logout', () => {
    it('makes request to backend', (done) => {
      const mockResponse = {
        detail: 'Successfully logged out',
      };

      service.logout().subscribe((res) => {
        expect(res).toEqual(mockResponse);
        done();
      });

      const req = httpTestingController.expectOne(
        environment.backend_endpoint + '/dj-rest-auth/logout/'
      );
      expect(req.request.method).toEqual('GET');
      req.flush(mockResponse);
      httpTestingController.verify();
    });

    it('updates logged in status to false and logged in user to be null', (done) => {
      const mockResponse = {
        detail: 'Successfully logged out',
      };

      service.logout().subscribe((_) => {
        expect(service.loggedInStatus$.value).toBeFalse();
        expect(service.loggedInUser$.value).toBeNull();
        done();
      });

      const req = httpTestingController.expectOne(
        environment.backend_endpoint + '/dj-rest-auth/logout/'
      );
      req.flush(mockResponse);
    });
  });

  describe('refreshLoggedInUser', () => {
    it('makes request to backend for access token and user', (done) => {
      const cookieServiceStub: CookieService = TestBed.inject(CookieService);
      spyOn(cookieServiceStub, 'get').and.callThrough();
      const mockResponse = { access: true };
      const mockUser = {
        email: 'test@test.com',
        username: 'test',
        first_name: 'Foo',
        last_name: 'Bar',
        pk: 10,
      };

      service.refreshLoggedInUser().subscribe((res) => {
        expect(res).toEqual({
          email: 'test@test.com',
          username: 'test',
          firstName: 'Foo',
          lastName: 'Bar',
          id: 10,
        });
        done();
      });

      const req1 = httpTestingController.expectOne(
        environment.backend_endpoint + '/dj-rest-auth/token/refresh/'
      );
      expect(req1.request.method).toEqual('POST');
      expect(cookieServiceStub.get).toHaveBeenCalled();
      req1.flush(mockResponse);

      const req2 = httpTestingController.expectOne(
        environment.backend_endpoint + '/dj-rest-auth/user/'
      );
      expect(req2.request.method).toEqual('GET');
      req2.flush(mockUser);

      httpTestingController.verify();
    });

    it('updates loggedInStatus to true when token is refreshed', (done) => {
      const mockResponse = { access: true };
      const mockUser = {
        email: 'test@test.com',
        username: 'test',
        first_name: 'Foo',
        last_name: 'Bar',
        pk: 12,
      };

      service.refreshLoggedInUser().subscribe((_) => {
        expect(service.loggedInStatus$.value).toBeTrue();
        expect(service.loggedInUser$.value).toEqual({
          email: 'test@test.com',
          username: 'test',
          firstName: 'Foo',
          lastName: 'Bar',
          id: 12,
        });
        done();
      });

      httpTestingController
        .expectOne(
          environment.backend_endpoint + '/dj-rest-auth/token/refresh/'
        )
        .flush(mockResponse);
      httpTestingController
        .expectOne(environment.backend_endpoint + '/dj-rest-auth/user/')
        .flush(mockUser);
    });

    it('updates loggedInStatus to false when token cannot be refreshed', (done) => {
      service.refreshLoggedInUser().subscribe(
        (_) => {
          expect(service.loggedInStatus$.value).toBeFalse();
          expect(service.loggedInUser$.value).toBeNull();
          done();
        },
        (_) => {
          expect(service.loggedInStatus$.value).toBeFalse();
          expect(service.loggedInUser$.value).toBeNull();
          done();
        }
      );

      httpTestingController
        .expectOne(
          environment.backend_endpoint + '/dj-rest-auth/token/refresh/'
        )
        .flush('Unsuccessful', { status: 400, statusText: 'Bad request' });
      httpTestingController.verify();
    });
  });

  describe('changePassword', () => {
    it('makes request to backend', () => {
      service.changePassword('password', 'testpass', 'testpass').subscribe();

      const req = httpTestingController.expectOne(
        environment.backend_endpoint + '/dj-rest-auth/password/change/'
      );
      expect(req.request.method).toEqual('POST');
      expect(req.request.body).toEqual({
        old_password: 'password',
        new_password1: 'testpass',
        new_password2: 'testpass',
      });
      req.flush({ details: 'success' });
      httpTestingController.verify();
    });
  });

  describe('updateUser', () => {
    it('makes request to backend', (done) => {
      const backendUser = {
        first_name: 'Foo',
        last_name: 'Bar',
        username: 'test',
        email: 'test@test.com',
      };
      const frontendUser = {
        firstName: 'Foo',
        lastName: 'Bar',
        username: 'test',
        email: 'test@test.com',
      };

      service.updateUser(frontendUser, 'currentpassword').subscribe((res) => {
        expect(res).toEqual(frontendUser);
        done();
      });

      const req = httpTestingController.expectOne(
        environment.backend_endpoint + '/dj-rest-auth/user/'
      );
      expect(req.request.method).toEqual('PATCH');
      expect(req.request.body).toEqual({
        ...backendUser,
        current_password: 'currentpassword',
      });
      req.flush(backendUser);
      httpTestingController.verify();
    });

    it('updates logged in user', (done) => {
      const backendUser = {
        first_name: 'Foo',
        last_name: 'Bar',
        username: 'test',
        email: 'test@test.com',
      };
      const frontendUser = {
        firstName: 'Foo',
        lastName: 'Bar',
        username: 'test',
        email: 'test@test.com',
      };

      service.updateUser(frontendUser, 'currentpassword').subscribe((_) => {
        expect(service.loggedInUser$.value).toEqual(frontendUser);
        done();
      });

      httpTestingController
        .expectOne(environment.backend_endpoint + '/dj-rest-auth/user/')
        .flush(backendUser);
    });
  });

  describe('getUser', () => {
    it('should make HTTP request to backend', () => {
      const user: User = {
        email: undefined,
        username: undefined,
        firstName: undefined,
        lastName: undefined,
      };

      service.getUser(1).subscribe((res) => {
        expect(res).toEqual(user);
      });

      const req = httpTestingController.expectOne(
        environment.backend_endpoint.concat('/users/get_user_by_id/?id=1')
      );
      expect(req.request.method).toEqual('GET');
      req.flush(user);
      httpTestingController.verify();
    });
  });

  describe('deactivateUser', () => {
    it('makes request to backend', (done) => {
      const user = {
        firstName: 'Foo',
        lastName: 'Bar',
        username: 'test',
        email: 'test@test.com',
        id: 10,
      };

      service.deactivateUser(user, 'password').subscribe((res) => {
        expect(res).toBeTrue();
        done();
      });

      const req = httpTestingController.expectOne(
        environment.backend_endpoint + '/users/deactivate/'
      );
      expect(req.request.method).toEqual('POST');
      expect(req.request.body).toEqual({
        email: 'test@test.com',
        password: 'password',
      });
      req.flush({ deleted: true });
      httpTestingController.verify();
    });
  });

  it('logs out user if successful', (done) => {
    const user = {
      firstName: 'Foo',
      lastName: 'Bar',
      username: 'test',
      email: 'test@test.com',
    };

    service.deactivateUser(user, 'password').subscribe((res) => {
      expect(service.loggedInStatus$.value).toBeFalse();
      expect(service.loggedInUser$.value).toBeNull();
      done();
    });

    httpTestingController
      .expectOne(environment.backend_endpoint + '/users/deactivate/')
      .flush({ deleted: true });
  });
});

describe('AuthGuard', () => {
  let service: AuthGuard;

  beforeEach(() => {
    const cookieServiceStub = () => ({ get: (string: string) => ({}) });
    const snackbarSpy = jasmine.createSpyObj<MatSnackBar>(
      'MatSnackBar',
      {
        open: undefined,
      },
      {}
    );
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        AuthGuard,
        { provide: CookieService, useFactory: cookieServiceStub },
        {
          provide: MatSnackBar,
          useValue: snackbarSpy,
        },
      ],
    });
    service = TestBed.inject(AuthGuard);
  });

  it('can load instance', () => {
    expect(service).toBeTruthy();
  });

  describe('canActivate', () => {
    it('returns true if refreshLoggedInUser succeeds', (done) => {
      const authServiceStub: AuthService = TestBed.inject(AuthService);
      spyOn(authServiceStub, 'refreshLoggedInUser').and.returnValue(
        of({ email: 'test@test.com' })
      );

      service.canActivate().subscribe((result) => {
        expect(result).toBeTrue();
        done();
      });
    });

    it('returns false and redirects to login if refreshLoggedInUser fails', (done) => {
      const authServiceStub: AuthService = TestBed.inject(AuthService);
      spyOn(authServiceStub, 'refreshLoggedInUser').and.returnValue(
        throwError(() => new Error())
      );
      const routerStub: Router = TestBed.inject(Router);
      spyOn(routerStub, 'navigate');

      service.canActivate().subscribe((result) => {
        expect(routerStub.navigate).toHaveBeenCalledOnceWith(['login']);
        expect(result).toBeFalse();
        done();
      });
    });
  });
});
