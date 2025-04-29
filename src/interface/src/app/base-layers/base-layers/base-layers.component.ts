import { Component } from '@angular/core';
import { BaseLayersListComponent } from '../base-layers-list/base-layers-list.component';
import { BaseLayersStateService } from '../base-layers.state.service';
import { AsyncPipe, NgForOf } from '@angular/common';
import { BaseLayer } from '@types';
import { map } from 'rxjs';

@Component({
  selector: 'app-base-layers',
  standalone: true,
  imports: [BaseLayersListComponent, AsyncPipe, NgForOf],
  templateUrl: './base-layers.component.html',
  styleUrl: './base-layers.component.scss',
})
export class BaseLayersComponent {
  selectedLayers$ = this.baseLayersStateService.selectedBaseLayers$;
  selectedLayersId$ = this.selectedLayers$.pipe(
    map((layers) => (layers ? layers.map((l) => l.id) : []))
  );
  categorizedBaseLayers$ = this.baseLayersStateService.categorizedBaseLayers$;

  constructor(private baseLayersStateService: BaseLayersStateService) {}

  updateSelectedLayer(data: { layer: BaseLayer; isMulti: boolean }) {
    this.baseLayersStateService.updateBaseLayers(data.layer, data.isMulti);
  }
}
