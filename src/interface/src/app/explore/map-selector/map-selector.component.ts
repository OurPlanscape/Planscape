import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonComponent } from '@styleguide';
import { delay, map, startWith } from 'rxjs';
import { DataLayersComponent } from '@app/data-layers/data-layers/data-layers.component';
import { MultiMapConfigState } from '@app/maplibre-map/multi-map-config.state';
import { DynamicDataLayersComponent } from '@app/explore/dynamic-data-layers/dynamic-data-layers.component';
import { DataLayersRegistryService } from '@app/explore/data-layers-registry';

@Component({
  selector: 'app-map-selector',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    NgClass,
    AsyncPipe,
    ButtonComponent,
    DataLayersComponent,
    DynamicDataLayersComponent,
  ],
  templateUrl: './map-selector.component.html',
  styleUrl: './map-selector.component.scss',
})
export class MapSelectorComponent {
  layoutMode$ = this.multiMapConfigState.layoutMode$;
  mapsArray$ = this.dataLayersRegistryService.size$.pipe(
    startWith(0),
    delay(0),
    map((layoutMode) =>
      Array.from({ length: layoutMode }, (_, mapNumber) => mapNumber + 1)
    )
  );

  selectedMapId$ = this.multiMapConfigState.selectedMapId$;

  constructor(
    private multiMapConfigState: MultiMapConfigState,
    private dataLayersRegistryService: DataLayersRegistryService
  ) {}

  setSelectedMap(id: number) {
    this.multiMapConfigState.setSelectedMap(id);
  }
}
