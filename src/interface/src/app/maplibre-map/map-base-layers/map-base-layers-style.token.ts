import { InjectionToken } from '@angular/core';
import { BaseLayer } from '@types';

/**
 * Style and ordering overrides for MapBaseLayersComponent, injected per-context.
 * Provide this token in a component's providers to customize how base layers
 * appear in that specific flow without changing the component itself.
 *
 * Example:
 *   providers: [{ provide: BASE_LAYER_STYLE, useValue: { fillColor: '#356A72' } }]
 */
export interface BaseLayerStyleOverride {
  /**
   * When provided, color/opacity overrides only apply to layers matching this predicate.
   * `insertBeforeLayer` is unaffected and applies to all rendered layers regardless.
   */
  appliesTo?: (layer: BaseLayer) => boolean;
  fillColor?: string;
  fillOpacity?: string;
  lineColor?: string;
  /**
   * MapLibre layer ID that base layers should be inserted below.
   * Evaluated lazily at render time — if the target layer doesn't exist yet
   * (e.g. on initial map load), the base layer is added at the top instead
   * and natural template order handles z-index.
   */
  insertBeforeLayer?: string;
}

export const BASE_LAYER_STYLE = new InjectionToken<BaseLayerStyleOverride>(
  'BASE_LAYER_STYLE'
);
