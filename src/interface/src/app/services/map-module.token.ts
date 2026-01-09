import { InjectionToken } from '@angular/core';

/**
 * Token used to define the module we want to consume for our datasets.
 * If you want to override the default module, for example with 'climate_foresight' module
 * you can declare a provider on your module like this:
 * providers: [
 *   ...
 *   MapModuleService,
 *   { provide: MAP_MODULE_NAME, useValue: 'climate_foresight' },
 *   ...
 * ]
 */
export const MAP_MODULE_NAME = new InjectionToken<string>('MAP_MODULE_NAME', {
  providedIn: 'root',
  factory: () => 'map', // default value
});
