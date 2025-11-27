// logging-http.interceptor.spec.ts
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  HttpErrorResponse,
  HttpHandler,
  HttpRequest,
} from '@angular/common/http';
import { throwError } from 'rxjs';

import { LoggingHttpInterceptor } from './logging-http.interceptor';

describe('LoggingHttpInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let logHttpErrorSpy: jasmine.Spy;

  beforeEach(() => {
    // spy on our own method, not on Sentry
    logHttpErrorSpy = spyOn(
      LoggingHttpInterceptor.prototype as any,
      'logHttpError' as any
    ).and.callThrough();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: LoggingHttpInterceptor,
          multi: true,
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should call logHttpError on HttpErrorResponse', () => {
    http.get('/test-url?foo=bar').subscribe({
      next: () => fail('should not succeed'),
      error: () => {
        // we don't care how caller handles it
      },
    });

    const req = httpMock.expectOne('/test-url?foo=bar');

    req.flush({ message: 'fail' }, { status: 500, statusText: 'Server Error' });

    expect(logHttpErrorSpy).toHaveBeenCalledTimes(1);

    const [errArg, reqArg] = logHttpErrorSpy.calls.mostRecent().args;

    expect(errArg instanceof HttpErrorResponse).toBeTrue();
    expect(errArg.status).toBe(500);
    expect(errArg.statusText).toBe('Server Error');

    expect(reqArg.method).toBe('GET');
    expect(reqArg.urlWithParams).toBe('/test-url?foo=bar');
  });

  it('should NOT call logHttpError for non-HttpErrorResponse errors', () => {
    const interceptor = new LoggingHttpInterceptor();

    const fakeHandler: HttpHandler = {
      handle: () =>
        // plain Error, NOT HttpErrorResponse
        throwError(() => new Error('boom')),
    };

    const request = new HttpRequest('GET', '/boom');

    interceptor.intercept(request, fakeHandler).subscribe({
      next: () => fail('should not succeed'),
      error: () => {
        // swallow, we only care about side effects
      },
    });

    expect(logHttpErrorSpy).not.toHaveBeenCalled();
  });
});
