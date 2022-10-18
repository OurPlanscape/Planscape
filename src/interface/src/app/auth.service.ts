import { CookieService } from 'ngx-cookie-service';
import { HttpClient, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, map, catchError, EMPTY, tap, shareReplay, of, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  loggedInStatus$: Subject<boolean> = new Subject();
  isLoggedIn$: Observable<boolean> = this.loggedInStatus$.pipe(shareReplay(1));

  private apiRoot = 'http://localhost:8000/dj-rest-auth/';

  constructor(
    private http: HttpClient,
    private cookieService: CookieService,
    private router: Router) {
      this.isLoggedIn$.subscribe();
      if (this.isLoggedIn()) {
        this.loggedInStatus$.next(true);
      } else {
        this.loggedInStatus$.next(false);
      }
     }

  login(username: string, password: string) {
    return this.http.post(
      this.apiRoot.concat('login/'),
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
      this.apiRoot.concat('registration/'),
      { username, password1, password2, email }
    );
  }

  logout() {
    return this.http.get(
      this.apiRoot.concat('logout/'),
      { withCredentials: true }
    ).pipe(
      tap(response => {
        this.loggedInStatus$.next(false);
      })
    );
  }

  isLoggedIn(): boolean {
    return this.cookieService.check('my-refresh-token');
  }

  isLoggedOut() {
    return !this.isLoggedIn();
  }

  refreshToken() {
    return this.http.post(
      this.apiRoot.concat('token/refresh/'),
      { refresh: this.cookieService.get('my-refresh-token') },
      { withCredentials: true }
    );
  }

  getLoggedInUser() {
    return this.http.get(
      this.apiRoot.concat('user'),
      { withCredentials: true }
    );
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) { }

  canActivate() {
    if (this.authService.isLoggedIn()) {
      return this.authService.refreshToken().pipe(
        map((response: any) => response.access),
        catchError(err => {
          console.log(err);
          return of(false);
        })
      );
    }
    return false;

  }
}
