import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import * as Sentry from '@sentry/angular';

@Injectable()
export class LoggingHttpInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      tap({
        error: (err) => {
          if (!(err instanceof HttpErrorResponse)) return;

          this.logHttpError(err, req);
        },
      })
    );
  }

  // isolated for easier testing
  private logHttpError(err: HttpErrorResponse, req: HttpRequest<any>): void {
    const message = `HTTP ${err.status} ${err.statusText || ''} — ${
      req.method
    } ${req.urlWithParams}`;

    Sentry.captureMessage(message, {
      level: 'error',
      tags: {
        type: 'http',
        status: String(err.status),
        method: req.method,
        requestUrl: req.urlWithParams,
      },
      extra: {
        httpError: err,
        responseBody: err.error,
      },
    });
  }
}
