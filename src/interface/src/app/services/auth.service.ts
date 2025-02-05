import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { SNACK_NOTICE_CONFIG } from '@shared';
import {
  BehaviorSubject,
  catchError,
  concatMap,
  map,
  Observable,
  of,
  switchMap,
  take,
  tap,
  throwError,
} from 'rxjs';
import { User } from '@types';
import { RedirectService } from './redirect.service';
import { environment } from '../../environments/environment';

interface LogoutResponse {
  detail: string;
}

export interface PasswordResetToken {
  userId: string;
  token: string;
}

export const authTokenRefreshKey = 'my-refresh-token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly authTokenKey = 'my-app-auth';
  loggedInStatus$ = new BehaviorSubject<boolean | null>(null);
  isLoggedIn$: Observable<boolean | null> = this.loggedInStatus$;
  loggedInUser$ = new BehaviorSubject<User | null | undefined>(undefined);

  private readonly API_ROOT = environment.backend_endpoint + '/dj-rest-auth/';

  constructor(
    private http: HttpClient,
    private cookieService: CookieService,
    private snackbar: MatSnackBar,
    private redirectService: RedirectService
  ) {}

  currentUser() {
    return this.loggedInUser$.value;
  }

  login(email: string, password: string) {
    return this.http
      .post(
        this.API_ROOT.concat('login/'),
        { email, password },
        { withCredentials: true }
      )
      .pipe(
        map((response) => {
          const redirectUrl = this.redirectService.shouldRedirect(email);
          // remove redirect
          this.redirectService.removeRedirect();
          return redirectUrl || 'home';
        }),
        tap((_) => {
          this.loggedInStatus$.next(true);
          this.getLoggedInUser()
            .pipe(take(1))
            .subscribe((user) => {
              this.loggedInUser$.next(user);
            });
        })
      );
  }

  signup(
    email: string,
    password1: string,
    password2: string,
    firstName: string,
    lastName: string
  ) {
    return this.http
      .post(this.API_ROOT.concat('registration/'), {
        password1,
        password2,
        email,
        first_name: firstName,
        last_name: lastName,
      })
      .pipe(
        tap(() => {
          const redirect = this.redirectService.shouldRedirect(email);
          if (redirect) {
            // associate the redirect with the newly created user
            this.redirectService.setRedirect(redirect, email);
          }
        })
      );
  }

  resendValidationEmail(email: string) {
    return this.http.post(this.API_ROOT.concat('registration/resend-email/'), {
      email,
    });
  }

  logout() {
    return this.http
      .get<LogoutResponse>(this.API_ROOT.concat('logout/'), {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          this.loggedInStatus$.next(false);
          this.loggedInUser$.next(null);
          this.snackbar.open(response.detail, 'Dismiss', SNACK_NOTICE_CONFIG);
        })
      );
  }

  validateAccount(token: string): Observable<boolean> {
    return this.http
      .post(this.API_ROOT.concat('registration/account-confirm-email/'), {
        key: token,
      })
      .pipe(
        map((_) => true),
        catchError((error: Error) => {
          return of(false);
        })
      );
  }

  private refreshToken() {
    return this.http
      .post(
        this.API_ROOT.concat('token/refresh/'),
        { refresh: this.cookieService.get(authTokenRefreshKey) },
        { withCredentials: true }
      )
      .pipe(
        tap((response: any) => {
          this.loggedInStatus$.next(!!response.access);
        }),
        catchError((err) => {
          this.loggedInStatus$.next(false);
          this.loggedInUser$.next(null);
          return throwError(err);
        })
      );
  }

  /** Fetch the currently logged in user from the backend. */
  refreshLoggedInUser(): Observable<User> {
    // Must refresh the auth cookie to retrieve user
    return this.refreshToken().pipe(
      concatMap((_) => {
        return this.getLoggedInUser();
      })
    );
  }

  getAuthCookie() {
    return this.cookieService.get(this.authTokenKey);
  }

  /**
   * removes the cookies for tokens
   */
  removeCookie() {
    this.cookieService.delete(authTokenRefreshKey);
    this.cookieService.delete(this.authTokenKey);
  }

  public getLoggedInUser(): Observable<User> {
    return this.http
      .get(this.API_ROOT.concat('user/'), { withCredentials: true })
      .pipe(
        map((response: any) => {
          const user: User = {
            email: response.email,
            username: response.username,
            firstName: response.first_name,
            lastName: response.last_name,
            id: response.pk,
          };
          this.loggedInUser$.next(user);
          return user;
        })
      );
  }

  changePassword(
    currentPassword: string,
    newPassword1: string,
    newPassword2: string
  ): Observable<any> {
    return this.http.post(
      this.API_ROOT.concat('password/change/'),
      {
        old_password: currentPassword,
        new_password1: newPassword1,
        new_password2: newPassword2,
      },
      {
        withCredentials: true,
      }
    );
  }

  sendPasswordResetEmail(email: string): Observable<any> {
    return this.http.post(
      this.API_ROOT.concat('password/reset/'),
      {
        email: email,
      },
      {
        withCredentials: true,
      }
    );
  }

  resetPassword(
    userId: string,
    token: string,
    password1: string,
    password2: string
  ): Observable<boolean> {
    return this.http
      .post(
        this.API_ROOT.concat('password/reset/confirm/'),
        {
          uid: userId,
          token: token,
          new_password1: password1,
          new_password2: password2,
        },
        {
          withCredentials: true,
        }
      )
      .pipe(
        map((response: any) => {
          return response.success;
        })
      );
  }

  /** Gets a user given the id. */
  getUser(userId: number): Observable<User> {
    const url = environment.backend_endpoint.concat(
      `/users/get_user_by_id/?id=${userId}`
    );
    return this.http
      .get(url, {
        withCredentials: true,
      })
      .pipe(
        take(1),
        map((response: any) => {
          const user: User = {
            email: response.email,
            username: response.username,
            firstName: response.first_name,
            lastName: response.last_name,
          };
          return user;
        })
      );
  }

  updateUserInfo(newUser: Partial<User>): Observable<User> {
    return this.http
      .patch(
        this.API_ROOT.concat('user'),
        {
          first_name: newUser.firstName,
          last_name: newUser.lastName,
        },
        {
          withCredentials: true,
        }
      )
      .pipe(
        map((response: any) => {
          const user: User = {
            email: response.email,
            username: response.username,
            firstName: response.first_name,
            lastName: response.last_name,
          };
          this.loggedInUser$.next(user);
          return user;
        })
      );
  }

  /**
   * deprecated
   * @param newUser
   * @param currentPassword
   */
  updateUser(newUser: User, currentPassword: string): Observable<User> {
    return this.http
      .patch(
        this.API_ROOT.concat('user/'),
        {
          email: newUser.email,
          username: newUser.username,
          first_name: newUser.firstName,
          last_name: newUser.lastName,
          current_password: currentPassword,
        },
        {
          withCredentials: true,
        }
      )
      .pipe(
        map((response: any) => {
          const user: User = {
            email: response.email,
            username: response.username,
            firstName: response.first_name,
            lastName: response.last_name,
          };
          this.loggedInUser$.next(user);
          return user;
        })
      );
  }

  /**
   * "Deletes" user from backend. The behavior of this command is to disable the user account,
   *  not fully delete it, so data can be restored later if necessary.
   */
  deactivateUser(user: User, password: string): Observable<boolean> {
    return this.http
      .post(
        environment.backend_endpoint.concat('/users/deactivate/'),
        {
          password: password,
          email: user.email,
        },
        {
          withCredentials: true,
        }
      )
      .pipe(
        take(1),
        map((result: any) => {
          this.loggedInStatus$.next(false);
          this.loggedInUser$.next(null);
          return result.deleted;
        })
      );
  }

  validatePasswordResetToken(tokenDetails: PasswordResetToken) {
    return this.http.get(
      this.API_ROOT.concat(
        'password/reset/',
        tokenDetails.userId,
        '/',
        tokenDetails.token
      )
    );
  }
}

/** An AuthGuard used to prevent access to pages that require sign-in. If the user is not signed
 *  in, redirect to the sign-in page.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  constructor(
    private authService: AuthService,
    private router: Router,
    private redirectService: RedirectService
  ) {}

  canActivate(
    route?: ActivatedRouteSnapshot,
    state?: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.isLoggedIn$.pipe(
      switchMap((loggedIn) => {
        if (loggedIn) {
          return of(true);
        }
        return this.authService.getLoggedInUser().pipe(map(() => true));
      }),
      catchError((_) => {
        if (state) {
          this.redirectService.setRedirect(state.url);
        }
        this.router.navigate(['login']);
        return of(false);
      })
    );
  }
}
