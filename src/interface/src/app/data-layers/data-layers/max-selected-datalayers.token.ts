import { InjectionToken } from '@angular/core';
import { DEFAULT_MAX_SELECTED_LAYERS } from '@shared/constants';

/**
 * Token that is used to set the max selected layers
 * If we want to override the default value for a service instance we should declare it on providers like this:
 * { provide: MAX_SELECTED_DATALAYERS, useValue: 2 }
 */
export const MAX_SELECTED_DATALAYERS = new InjectionToken<number>(
  'MAX_SELECTED_DATALAYERS',
  {
    providedIn: 'root',
    factory: () => DEFAULT_MAX_SELECTED_LAYERS, // Setting a default value
  }
);
