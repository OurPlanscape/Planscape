import { InjectionToken } from '@angular/core';

/**
 * Token that is used to enable or disable the geometry parameter
 * If we want to override the default value for a service instance we should declare it on providers like this:
 * { provide: USE_GEOMETRY, useValue: true }
 */
export const USE_GEOMETRY = new InjectionToken<boolean>('GEOMETRY', {
  providedIn: 'root',
  factory: () => false, // Setting a default value
});
