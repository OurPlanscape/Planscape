import { InjectionToken } from '@angular/core';
import { ModuleEnum } from '@api/planscapeAPI.schemas';

/**
 * Token used to define the module we want to consume for our datasets.
 * If you want to override the default module, for example with 'climate_foresight' module
 * you can declare a provider on your module like this:
 * providers: [
 *   ...
 *   MapModuleService,
 *   { provide: MAP_MODULE_NAME, useValue: ModuleEnum.climate_foresight },
 *   ...
 * ]
 */
export const MAP_MODULE_NAME = new InjectionToken<ModuleEnum>(
  'MAP_MODULE_NAME',
  {
    providedIn: 'root',
    factory: () => ModuleEnum.map,
  }
);
