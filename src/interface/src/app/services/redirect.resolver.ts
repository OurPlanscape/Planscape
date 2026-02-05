import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { RedirectService } from '@services/redirect.service';

export const redirectResolver: ResolveFn<string | boolean> = (
  route: ActivatedRouteSnapshot
) => {
  const redirect = route.queryParams['redirect'] as string;
  if (redirect) {
    inject(RedirectService).setRedirect(redirect);
    return redirect;
  }
  return false;
};
