import { inject, InjectionToken, Provider } from '@angular/core';
import { FeatureService } from '@features/feature.service';

/**
 * Token that is used to enable or disable the geometry parameter
 * If we want to override the default value for a service instance we should declare it on providers like this:
 * { provide: USE_GEOMETRY, useValue: true }
 */
export const USE_GEOMETRY = new InjectionToken<boolean>('GEOMETRY', {
  providedIn: 'root',
  factory: () => false, // Setting a default value
});

/** Narrows layers to the planning area only while DATA_ORGANIZATION is on. */
export function provideDataOrganizationGeometry(): Provider {
  return {
    provide: USE_GEOMETRY,
    useFactory: () =>
      inject(FeatureService).isFeatureEnabled('DATA_ORGANIZATION'),
  };
}
