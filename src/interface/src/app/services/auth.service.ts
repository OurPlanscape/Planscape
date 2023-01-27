import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { BehaviorSubject, catchError, map, Observable, of, Subject, tap, concatMap, take } from 'rxjs';

import { BackendConstants } from '../backend-constants';

interface LogoutResponse {
  detail: string;
}

export interface User {
  username: string,
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  loggedInStatus$ = new BehaviorSubject(false);
  isLoggedIn$: Observable<boolean> = this.loggedInStatus$;
  loggedInUser$ = new BehaviorSubject<User | null>(null);

  private readonly API_ROOT = BackendConstants.END_POINT + '/dj-rest-auth/';

  constructor(
    private http: HttpClient,
    private cookieService: CookieService,
    private snackbar: MatSnackBar) { }

  login(username: string, password: string) {
    return this.http.post(
      this.API_ROOT.concat('login/'),
      { username, password },
      { withCredentials: true }
    ).pipe(
      tap(_ => {
        this.loggedInStatus$.next(true);
        this.getLoggedInUser().pipe(take(1)).subscribe(user => {
          this.loggedInUser$.next(user);
        });
      }),

    );
  }

  signup(username: string, email: string, password1: string, password2: string) {
    return this.http.post(
      this.API_ROOT.concat('registration/'),
      { username, password1, password2, email }
    ).pipe(
      tap(_ => {
        this.loggedInStatus$.next(true);
        this.getLoggedInUser().pipe(take(1)).subscribe();
      })
    );
  }

  logout() {
    return this.http.get<LogoutResponse>(
      this.API_ROOT.concat('logout/'),
      { withCredentials: true }
    ).pipe(
      tap(response => {
        this.loggedInStatus$.next(false);
        this.loggedInUser$.next(null);
        this.snackbar.open(response.detail);
      })
    );
  }

  private refreshToken() {
    return this.http.post(
      this.API_ROOT.concat('token/refresh/'),
      { refresh: this.cookieService.get('my-refresh-token') },
      { withCredentials: true }
    ).pipe(tap((response: any) => {
      this.loggedInStatus$.next(!!(response.access));
    }));
  }

  /** Fetch the currently logged in user from the backend. */
  refreshLoggedInUser(): Observable<User> {
    // Must refresh the auth cookie to retrieve user
    return this.refreshToken().pipe(concatMap(_ => {
      return this.getLoggedInUser();
    }));
  }

  private getLoggedInUser(): Observable<User> {
    return this.http.get(
      this.API_ROOT.concat('user/'),
      { withCredentials: true }
    ).pipe(map((response: any) => {
      const user: User = {
        username: response.username
      }
      this.loggedInUser$.next(user);
      return user;
    }));
  }
}

// This AuthGuard can be used to guard any routes that require permissions or a
// logged in user. Currently it isn't used to guard any routes.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) { }

  canActivate(): Observable<boolean> {
    return this.authService.refreshLoggedInUser().pipe(
      map(_ => true),
      catchError(_ => of(false))
    );

  }
}
