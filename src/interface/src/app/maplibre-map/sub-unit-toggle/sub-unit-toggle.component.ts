import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToggleComponent } from '@styleguide';
import { NewScenarioState } from '@scenario-creation/new-scenario.state';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';
import { BaseLayer } from '@types';

@Component({
  selector: 'app-sub-unit-toggle',
  standalone: true,
  imports: [AsyncPipe, FormsModule, ToggleComponent],
  templateUrl: './sub-unit-toggle.component.html',
  styleUrl: './sub-unit-toggle.component.scss',
})
export class SubUnitToggleComponent {
  showBaseLayer = false;

  layer$ = this.newScenarioState.selectedSubUnitLayer$;

  constructor(
    private newScenarioState: NewScenarioState,
    private baseLayersStateService: BaseLayersStateService
  ) {}

  toggleBaseLayer(layer: BaseLayer) {
    if (this.showBaseLayer) {
      this.baseLayersStateService.addBaseLayer(layer);
    } else {
      this.baseLayersStateService.removeBaseLayer(layer);
    }
  }
}
