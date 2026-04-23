import { Component } from '@angular/core';
import { SharedModule } from '@shared';
import { ScenarioMapComponent } from '@maplibre-map/scenario-map/scenario-map.component';
import { BASE_LAYER_STYLE } from '@maplibre-map/map-base-layers/map-base-layers-style.token';
import { SUB_UNIT_LAYER_COLOR } from '@scenario/scenario.constants';
import { ScenarioState } from '@scenario/scenario.state';
import { BaseLayer } from '@types';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';

/**
 * This component wraps the projected content on a right side panel and shows the
 * scenario map on the left main colum.
 *
 * TODO:  Might be renamed?
 */
@Component({
  standalone: true,
  selector: 'app-scenario',
  templateUrl: './scenario.component.html',
  styleUrl: './scenario.component.scss',
  imports: [SharedModule, ScenarioMapComponent, NavBarComponent],
  providers: [
    {
      provide: BASE_LAYER_STYLE,
      useFactory: (state: ScenarioState) => ({
        fillColor: SUB_UNIT_LAYER_COLOR,
        lineColor: SUB_UNIT_LAYER_COLOR,
        insertBeforeLayer: 'scenario-stands-fill',
        appliesTo: (layer: BaseLayer) =>
          layer.id === state.currentSubUnitsLayerId,
      }),
      deps: [ScenarioState],
    },
  ],
})
export class ScenarioComponent {
  constructor() {}
}
