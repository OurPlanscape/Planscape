import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CookieService } from 'ngx-cookie-service';

import { AuthService, AuthGuard } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    const cookieServiceStub = () => ({ get: (string: string) => ({}) });
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: CookieService, useFactory: cookieServiceStub }
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('can load instance', () => {
    expect(service).toBeTruthy();
  });

  it(`isLoggedIn$ has default value`, () => {
    expect(service.isLoggedIn$).toEqual(service.loggedInStatus$);
  });

  describe('login', () => {
    it('makes expected calls', () => {
      const httpTestingController = TestBed.inject(HttpTestingController);
      const mockResponse = {
        accessToken: 'test'
      };
      service.login('username', 'password').subscribe(res => {
        expect(res).toEqual(mockResponse);
      });
      const req = httpTestingController.expectOne('http://localhost:8000/dj-rest-auth/login/');
      expect(req.request.method).toEqual('POST');
      req.flush(mockResponse);
      httpTestingController.verify();
    });

    it('updates logged in status to true', () => {
      const httpTestingController = TestBed.inject(HttpTestingController);
      spyOn(service.loggedInStatus$, 'next').and.callThrough();
      const mockResponse = {
        accessToken: 'test'
      };
      service.login('username', 'password').subscribe(_ => {
        expect(service.loggedInStatus$.next).toHaveBeenCalledOnceWith(true);
      });
      const req = httpTestingController.expectOne('http://localhost:8000/dj-rest-auth/login/');
      req.flush(mockResponse);
    });
  });

  describe('signup', () => {
    it('makes expected calls', () => {
      const httpTestingController = TestBed.inject(HttpTestingController);
      const mockResponse = {
        accessToken: 'test'
      };
      service.signup('username', 'email', 'password1', 'password2').subscribe(res => {
        expect(res).toEqual(mockResponse);
      });
      const req = httpTestingController.expectOne('http://localhost:8000/dj-rest-auth/registration/');
      expect(req.request.method).toEqual('POST');
      req.flush(mockResponse);
      httpTestingController.verify();
    });
  });

  describe('logout', () => {
    it('makes expected calls', () => {
      const httpTestingController = TestBed.inject(HttpTestingController);
      const mockResponse = {
        detail: 'Successfully logged out'
      };
      service.logout().subscribe(res => {
        expect(res).toEqual(mockResponse);
      });
      const req = httpTestingController.expectOne('http://localhost:8000/dj-rest-auth/logout/');
      expect(req.request.method).toEqual('GET');
      req.flush(mockResponse);
      httpTestingController.verify();
    });

    it('updates logged in status to false', () => {
      const httpTestingController = TestBed.inject(HttpTestingController);
      const mockResponse = {
        detail: 'Successfully logged out'
      };
      spyOn(service.loggedInStatus$, 'next').and.callThrough();
      service.logout().subscribe(_ => {
        expect(service.loggedInStatus$.next).toHaveBeenCalledOnceWith(false);
      });
      const req = httpTestingController.expectOne('http://localhost:8000/dj-rest-auth/logout/');
      req.flush(mockResponse);
    });
  });

  describe('refreshToken', () => {
    it('makes expected calls', () => {
      const httpTestingController = TestBed.inject(HttpTestingController);
      const cookieServiceStub: CookieService = TestBed.inject(CookieService);
      spyOn(cookieServiceStub, 'get').and.callThrough();
      const mockResponse = { access: true };
      service.refreshToken().subscribe(res => {
        expect(res).toEqual(mockResponse);
      });
      const req = httpTestingController.expectOne('http://localhost:8000/dj-rest-auth/token/refresh/');
      expect(req.request.method).toEqual('POST');
      expect(cookieServiceStub.get).toHaveBeenCalled();
      req.flush(mockResponse);
      httpTestingController.verify();
    });

    it('updates loggedInStatus to true when token is refreshed', () => {
      const httpTestingController = TestBed.inject(HttpTestingController);
      const mockResponse = { access: true };
      spyOn(service.loggedInStatus$, 'next').and.callThrough();
      service.refreshToken().subscribe(_ => {
        expect(service.loggedInStatus$.next).toHaveBeenCalledOnceWith(true);
      });
      const req = httpTestingController.expectOne('http://localhost:8000/dj-rest-auth/token/refresh/');
      req.flush(mockResponse);
    });

    it('updates loggedInStatus to false when token cannot be refreshed', () => {
      const httpTestingController = TestBed.inject(HttpTestingController);
      const errorResponse = new HttpErrorResponse({
        error: 'test 404 error',
        status: 404, statusText: 'Not Found'
      });
      spyOn(service.loggedInStatus$, 'next').and.callThrough();
      service.refreshToken().subscribe(_ => {
        expect(service.loggedInStatus$.next).toHaveBeenCalledOnceWith(false);
      });
      const req = httpTestingController.expectOne('http://localhost:8000/dj-rest-auth/token/refresh/');
      req.flush(errorResponse);
    });
  });

  describe('getLoggedInUser', () => {
    it('makes expected calls', () => {
      const httpTestingController = TestBed.inject(HttpTestingController);
      const mockResponse = { username: 'username' };
      service.getLoggedInUser().subscribe(res => {
        expect(res).toEqual(mockResponse);
      });
      const req = httpTestingController.expectOne('http://localhost:8000/dj-rest-auth/user/');
      expect(req.request.method).toEqual('GET');
      req.flush(mockResponse);
      httpTestingController.verify();
    });
  });
});

describe('AuthGuard', () => {
  let service: AuthGuard;

  beforeEach(() => {
    const cookieServiceStub = () => ({ get: (string: string) => ({}) });
    TestBed.configureTestingModule({
      imports: [ HttpClientTestingModule ],
      providers: [
        AuthService,
        AuthGuard,
        { provide: CookieService, useFactory: cookieServiceStub }
      ]
    });
    service = TestBed.inject(AuthGuard);
  });

  it('can load instance', () => {
    expect(service).toBeTruthy();
  });

  describe('canActivate', () => {
    it('returns true if refreshToken succeeds', () => {
      const authServiceStub: AuthService = TestBed.inject(AuthService);
      spyOn(authServiceStub, 'refreshToken').and.returnValue(of({access: true}));
      service.canActivate().subscribe(result => {
        expect(result).toBeTrue();
      });
    });

    it('returns false if refreshToken fails', () => {
      const authServiceStub: AuthService = TestBed.inject(AuthService);
      spyOn(authServiceStub, 'refreshToken').and.returnValue(throwError(() => new Error()));
      service.canActivate().subscribe(result => {
        expect(result).toBeFalse();
      });
    });
  })
});
