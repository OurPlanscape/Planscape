import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';

import { FeatureService } from './feature.service';

/** Guard for a route based on whether a feature flag is enabled. */
export const createFeatureGuard: (
  featureName: string
) => CanMatchFn | CanActivateFn = (featureName: string) => () => {
  const featureService = inject(FeatureService);
  const router = inject(Router);

  if (featureService.isFeatureEnabled(featureName)) return true;

  // Redirect to the default page.
  return router.parseUrl('');
};
