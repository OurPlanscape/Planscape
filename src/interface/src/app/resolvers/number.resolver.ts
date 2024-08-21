import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { inject } from '@angular/core';

/**
 * Parses a param into number, and redirects if invalid
 * @param paramName the parameter to look
 * @param redirectTo the route to redirect
 */
export function numberResolver(
  paramName: string,
  redirectTo: string
): ResolveFn<number | null> {
  return (route: ActivatedRouteSnapshot): Observable<number | null> => {
    const router = inject(Router);
    const param = route.paramMap.get(paramName);
    const numValue = Number(param);

    // Check if the parameter is a valid number
    if (!isNaN(numValue) && param !== null) {
      return of(numValue);
    } else {
      // If invalid, navigate to the redirect route
      router.navigate([redirectTo]);
      return of(null);
    }
  };
}
