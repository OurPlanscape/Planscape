import { Component } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { DataLayersService } from '@services';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';
import { ToggleComponent } from '@styleguide';

@Component({
  selector: 'app-base-layer-toggle',
  standalone: true,
  imports: [MatSlideToggleModule, FormsModule, ToggleComponent],
  templateUrl: './base-layer-toggle.component.html',
  styleUrl: './base-layer-toggle.component.scss',
})
export class BaseLayerToggleComponent {
  showBaseLayer = false;

  //hack
  id = 4183;
  layer: any;
  constructor(
    private bas: DataLayersService,
    private baseLayersStateService: BaseLayersStateService
  ) {}

  toggleBaseLayer() {
    this.bas.getDataLayersByIds([this.id]).subscribe(
      (layers) => {
        console.log(layers);
        this.layer = layers[0];
        // @ts-ignore
        this.baseLayersStateService.setBaseLayers(layers);
      },
      (error) => {
        console.error('Error toggling base layer:', error);
      }
    );
  }
}
