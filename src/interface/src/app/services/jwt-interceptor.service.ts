import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { catchError, Observable, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class JwtInterceptor implements HttpInterceptor {
  private readonly maxRetryAttempts = 3;
  private retryCount = 0;

  constructor(private auth: AuthService) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error) => {
        if (
          error instanceof HttpErrorResponse &&
          !request.url.includes('login') &&
          error.status === 401
        ) {
          return this.handle401Error(request, next);
        }
        throw error;
      })
    );
  }

  handle401Error(request: HttpRequest<any>, next: HttpHandler) {
    this.retryCount++;
    if (this.retryCount >= this.maxRetryAttempts) {
      this.auth.removeCookie();
    }
    return this.auth.refreshLoggedInUser().pipe(
      switchMap(() => {
        this.retryCount = 0;
        return next.handle(request);
      })
    );
  }
}
