import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRouteSnapshot, CanActivate, Resolve, Router, RouterStateSnapshot } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import {
  BehaviorSubject,
  catchError,
  concatMap,
  map,
  Observable,
  of,
  take,
  tap,
} from 'rxjs';

import { BackendConstants } from '../backend-constants';
import { User } from '../types';

interface LogoutResponse {
  detail: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  loggedInStatus$ = new BehaviorSubject(false);
  isLoggedIn$: Observable<boolean> = this.loggedInStatus$;
  loggedInUser$ = new BehaviorSubject<User | null>(null);

  private readonly API_ROOT = BackendConstants.END_POINT + '/dj-rest-auth/';

  constructor(
    private http: HttpClient,
    private cookieService: CookieService,
    private snackbar: MatSnackBar
  ) {}

  login(email: string, password: string) {
    return this.http
      .post(
        this.API_ROOT.concat('login/'),
        { email, password },
        { withCredentials: true }
      )
      .pipe(
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
        concatMap((_) => {
          return this.login(email, password1);
        })
      );
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
          this.snackbar.open(response.detail);
        })
      );
  }

  validateAccount(token: string) {
    return this.http
      .post(this.API_ROOT.concat('registration/account-confirm-email/'), {
        key: token,
      });
  }

  private refreshToken() {
    return this.http
      .post(
        this.API_ROOT.concat('token/refresh/'),
        { refresh: this.cookieService.get('my-refresh-token') },
        { withCredentials: true }
      )
      .pipe(
        tap((response: any) => {
          this.loggedInStatus$.next(!!response.access);
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

  private getLoggedInUser(): Observable<User> {
    return this.http
      .get(this.API_ROOT.concat('user/'), { withCredentials: true })
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

  changePassword(currentPassword: string, newPassword1: string, newPassword2: string): Observable<any> {
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

  /** Gets a user given the id. */
  getUser(userId: string): Observable<User> {
    const url = BackendConstants.END_POINT.concat(
      '/users/get_user_by_id/?id=',
      userId
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

  updateUser(newUser: User): Observable<User> {
    return this.http
      .patch(
        this.API_ROOT.concat('user/'),
        {
          email: newUser.email,
          username: newUser.username,
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
   * "Deletes" user from backend. The behavior of this command is to disable the user account,
   *  not fully delete it, so data can be restored later if necessary.
   */
  deleteUser(user: User, password: string): Observable<boolean> {
    return this.http
      .post(
        BackendConstants.END_POINT.concat('/users/delete/'),
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
}

/** An AuthGuard used to prevent access to pages that require sign-in. If the user is not signed
 *  in, redirect to the sign-in page.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.refreshLoggedInUser().pipe(
      map((_) => true),
      catchError((_) => {
        this.router.navigate(['login']);
        return of(false);
      })
    );
  }
}

/** The ValidateGuard validates the email address of a new account, and logs the user in while at it.
 */
@Injectable()
export class ValidationResolver implements Resolve<boolean> {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
    ): Observable<boolean> {
    const token = route.paramMap.get('id');
    if (!token) {
      this.router.navigate(['login']);
    }
    this.authService.validateAccount(token!)
    return this.authService.refreshLoggedInUser().pipe(
      map((_) => true),
      catchError((_) => {
        this.router.navigate(['login']);
        return of(false);
      })
    );
  }
}
