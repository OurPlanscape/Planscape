import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToggleComponent } from '@styleguide';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';
import { BaseLayer } from '@types';

@Component({
  selector: 'app-sub-unit-toggle',
  standalone: true,
  imports: [FormsModule, ToggleComponent],
  templateUrl: './sub-unit-toggle.component.html',
  styleUrl: './sub-unit-toggle.component.scss',
})
export class SubUnitToggleComponent {
  @Input({ required: true }) layer!: BaseLayer;

  showBaseLayer = true;

  constructor(private baseLayersStateService: BaseLayersStateService) {}

  toggleBaseLayer(layer: BaseLayer) {
    if (this.showBaseLayer) {
      this.baseLayersStateService.addBaseLayer(layer);
    } else {
      this.baseLayersStateService.removeBaseLayer(layer);
    }
  }
}
