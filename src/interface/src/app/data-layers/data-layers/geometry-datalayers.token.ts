import { InjectionToken } from '@angular/core';

/**
 * Token that is used to enable or disable the geometry parameter
 * If we want to override the default value for a service instance we should declare it on providers like this:
 * { provide: SEND_GEOMETRY, useValue: true }
 */
export const SEND_GEOMETRY = new InjectionToken<boolean>('GEOMETRY', {
  providedIn: 'root',
  factory: () => false, // Setting a default value
});
