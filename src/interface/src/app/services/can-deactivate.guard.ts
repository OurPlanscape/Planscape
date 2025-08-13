import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

/* Implemented by any route-associated component when we want to check whther it's
acceptable to navigate to a different route.
If the method returns true, navigation is allowed; if it returns false, navigation is prevented.

Note that routes will only intercept navigation within our app, not outside of our app.
*/
export interface CanComponentDeactivate {
  canDeactivate(): Observable<boolean> | boolean;
}

/* A Guard that checks the result of a canDeactivate() method from 
route-associated components (see interface above) to see if we want to proceed with navigation
to a different route.
*/

export const canDeactivateGuard: CanDeactivateFn<CanComponentDeactivate> = (
  component
) => {
  return component.canDeactivate ? component.canDeactivate() : true;
};
