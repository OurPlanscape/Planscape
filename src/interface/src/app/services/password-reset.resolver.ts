import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  ResolveFn,
} from '@angular/router';
import { catchError, of, map } from 'rxjs';

import { AuthService, PasswordResetToken } from './auth.service';

/** Resolver to validate the password reset token. */
export const passwordResetTokenResolver: ResolveFn<
  PasswordResetToken | null
> = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const userId = route.paramMap.get('userId');
  const token = route.paramMap.get('token');
  if (!userId || !token) {
    inject(Router).navigate(['reset']);
  }
  const passwordResetToken = {
    userId: userId || '',
    token: token || '',
  };
  return inject(AuthService)
    .validatePasswordResetToken(passwordResetToken)
    .pipe(
      map((_) => {
        return passwordResetToken;
      }),
      catchError((error: Error) => {
        return of(null);
      })
    );
};
