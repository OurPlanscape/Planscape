import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';

/**
 * Resets data layers, so we can allow clean states between shared routes.
 * This is not ideal, we should rely on providers:[] instead and let angular
 * create and destroy instances of this.
 * However, given how tightly coupled plan and scenario pages/routes are,
 * angular is unable to destroy and recreate DataLayersStateService.
 * This resolver is a workaround to reset state on each route.
 */
export const resetDatalayerResolver: ResolveFn<boolean> = (
  route: ActivatedRouteSnapshot
) => {
  const dataLayerState = inject(DataLayersStateService);
  dataLayerState.resetAll();
  return true;
};
