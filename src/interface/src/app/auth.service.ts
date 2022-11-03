import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { BehaviorSubject, catchError, map, Observable, of, Subject, tap } from 'rxjs';

export interface User {
  username: string,
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  loggedInStatus$: Subject<boolean> = new BehaviorSubject(false);
  isLoggedIn$: Observable<boolean> = this.loggedInStatus$;

  private readonly API_ROOT = 'http://localhost:8000/dj-rest-auth/';

  constructor(
    private http: HttpClient,
    private cookieService: CookieService) {
      this.isLoggedIn$.subscribe();
      // Try to refresh the user's access token
      this.refreshToken().pipe(
        map((response: any) => !!(response.access)),
        catchError(err => {
          console.log(err);
          return of(false);
        })
      ).subscribe(result => {
        this.loggedInStatus$.next(result);
      });
     }

  login(username: string, password: string) {
    return this.http.post(
      this.API_ROOT.concat('login/'),
      { username, password },
      { withCredentials: true }
    ).pipe(
      tap(response => {
        this.loggedInStatus$.next(true);
      })
    );
  }

  signup(username: string, email: string, password1: string, password2: string) {
    return this.http.post(
      this.API_ROOT.concat('registration/'),
      { username, password1, password2, email }
    );
  }

  logout() {
    return this.http.get(
      this.API_ROOT.concat('logout/'),
      { withCredentials: true }
    ).pipe(
      tap(response => {
        this.loggedInStatus$.next(false);
      })
    );
  }

  refreshToken() {
    return this.http.post(
      this.API_ROOT.concat('token/refresh/'),
      { refresh: this.cookieService.get('my-refresh-token') },
      { withCredentials: true }
    );
  }

  getLoggedInUser(): Observable<User> {
    return this.http.get(
      this.API_ROOT.concat('user'),
      { withCredentials: true }
    ).pipe(map((response: any) => {
      const user: User = {
        username: response.username
      }
      return user;
    }));
  }
}

// This AuthGuard can be used to guard any routes that require permissions or a
// logged in user. Currently it isn't used to guard any routes.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) { }

  canActivate() {
    return this.authService.refreshToken().pipe(
      map((response: any) => response.access),
      catchError(err => {
        console.log(err);
        return of(false);
      })
    );

  }
}
