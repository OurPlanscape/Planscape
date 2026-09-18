import { InjectionToken } from '@angular/core';

/**
 * Token that is used to determine if a layer is checked automatically
 * or if it needs to be selected manually
 */
export const SELECTION_MODE = new InjectionToken<'AUTOMATIC' | 'MANUAL'>(
  'SELECTION_MODE',
  {
    providedIn: 'root',
    factory: () => 'AUTOMATIC', // Setting a default value
  }
);
