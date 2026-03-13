import { InjectionToken } from '@angular/core';

/**
 * Token used to define if we want to save the multimap config on storage.
 * If you want to override the default value
 * you can declare a provider on your module like this:
 * providers: [
 *   ...
 *   MultiMapConfigState
 *   { provide: MULTIMAP_STORAGE, useValue: false },
 *   ...
 * ]
 */
export const MULTIMAP_STORAGE = new InjectionToken<boolean>(
  'MULTIMAP_STORAGE',
  {
    providedIn: 'root',
    factory: () => true, // default value
  }
);
