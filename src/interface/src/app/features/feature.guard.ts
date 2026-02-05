import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { FeatureService } from '@app/features/feature.service';

interface FeatureGuardOptions {
  featureName: string;
  /** either a literal path with `:param` placeholders… */
  fallback?: string;
  /** …or a function that can build it from the snapshot */
  fallbackFn?: (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ) => string;
  inverted?: boolean;
}

export const createFeatureGuard =
  (opts: FeatureGuardOptions): CanActivateFn =>
  (route, state) => {
    const featureService = inject(FeatureService);
    const router = inject(Router);

    const enabled = featureService.isFeatureEnabled(opts.featureName);
    const allow = opts.inverted ? !enabled : enabled;
    if (allow) return true;

    // 1) If they passed a builder fn, use it…
    let url =
      opts.fallbackFn?.(route, state) ??
      // 2) …otherwise do simple ":param" → actual-param replacement
      (opts.fallback || '').replace(
        /:([^/]+)/g,
        (_, key) => route.paramMap.get(key) ?? ''
      );

    return router.parseUrl(url || '/');
  };
