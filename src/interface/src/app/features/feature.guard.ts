import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';

import { FeatureService } from './feature.service';

interface FeatureGuardOptions {
  featureName: string;
  fallback?: string;
  inverted?: boolean;
}

/** Guard for a route based on whether a feature flag is enabled. */
export const createFeatureGuard: (
  options: FeatureGuardOptions
) => CanMatchFn | CanActivateFn = (options) => () => {
  const featureService = inject(FeatureService);
  const router = inject(Router);

  const enabled = featureService.isFeatureEnabled(options.featureName);

  // if inverted, flip the flag; otherwise, leave it as‐is
  const shouldActivate = options.inverted ? !enabled : enabled;

  return shouldActivate ? true : router.parseUrl(options.fallback || '');
};
