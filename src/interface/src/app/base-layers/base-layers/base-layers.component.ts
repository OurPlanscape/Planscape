import { Component } from '@angular/core';
import { BaseLayersListComponent } from '../base-layers-list/base-layers-list.component';
import { BaseLayersStateService } from '../base-layers.state.service';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { BaseLayer } from '@types';
import { map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { ButtonComponent } from '@styleguide';

@Component({
  selector: 'app-base-layers',
  standalone: true,
  imports: [
    AsyncPipe,
    BaseLayersListComponent,
    ButtonComponent,
    MatButtonModule,
    NgForOf,
    NgIf,
  ],
  templateUrl: './base-layers.component.html',
  styleUrl: './base-layers.component.scss',
})
export class BaseLayersComponent {
  selectedLayers$ = this.baseLayersStateService.selectedBaseLayers$;
  selectedLayersId$ = this.selectedLayers$.pipe(
    map((layers) => {
      if (layers && layers.length) {
        return layers.map((l) => l.id);
      }
      return [];
    })
  );
  categorizedBaseLayers$ = this.baseLayersStateService.categorizedBaseLayers$;

  constructor(private baseLayersStateService: BaseLayersStateService) {}

  updateSelectedLayer(data: { layer: BaseLayer; isMulti: boolean }) {
    this.baseLayersStateService.updateBaseLayers(data.layer, data.isMulti);
  }

  clearBaseLayer() {
    this.baseLayersStateService.clearBaseLayer();
  }
}
