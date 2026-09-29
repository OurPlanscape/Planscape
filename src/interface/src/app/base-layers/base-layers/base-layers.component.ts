import { Component, Input } from '@angular/core';
import { BaseLayersListComponent } from '@base-layers/base-layers-list/base-layers-list.component';
import { BaseLayersStateService } from '../base-layers.state.service';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { BaseLayer } from '@types';
import { map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { ButtonComponent, SearchBarComponent } from '@styleguide';
import { MapModuleService } from '@services/map-module.service';

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
    SearchBarComponent,
  ],
  templateUrl: './base-layers.component.html',
  styleUrl: './base-layers.component.scss',
})
export class BaseLayersComponent {
  /** Only the DATA_ORGANIZATION sidebar shows the search bar. */
  @Input() showSearch = false;

  selectedLayers$ = this.baseLayersStateService.selectedBaseLayers$;
  selectedLayersDataSet$ = this.selectedLayers$.pipe(
    // just return the first item data set id, as we can only have 1 dataset active.
    map((layers) => layers?.[0]?.dataset.id ?? null)
  );
  selectedLayersId$ = this.selectedLayers$.pipe(
    map((layers) => {
      if (layers && layers.length) {
        return layers.map((l) => l.id);
      }
      return [];
    })
  );

  baseDataSets$ = this.mapModuleService.datasets$.pipe(
    map((mapData) => mapData.base_datasets)
  );

  constructor(
    private baseLayersStateService: BaseLayersStateService,
    private mapModuleService: MapModuleService
  ) {}

  updateSelectedLayer(data: { layer: BaseLayer; isMulti: boolean }) {
    this.baseLayersStateService.updateBaseLayers(data.layer, data.isMulti);
  }

  clearBaseLayer() {
    this.baseLayersStateService.clearBaseLayer();
  }

  // TODO: wire up base layer search
  search(_term: string) {}

  clearSearch() {}
}
