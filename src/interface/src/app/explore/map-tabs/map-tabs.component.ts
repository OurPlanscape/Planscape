import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { delay, map, shareReplay, startWith } from 'rxjs';
import { MultiMapConfigState } from '@maplibre-map/multi-map-config.state';
import { DynamicDataLayersComponent } from '@explore/dynamic-data-layers/dynamic-data-layers.component';
import { DataLayersRegistryService } from '../data-layers-registry';

/**
 * Data layers for each map, switched with tabs under the search bar.
 * Map viewer panel used when DATA_ORGANIZATION is on.
 */
@Component({
  selector: 'app-map-tabs',
  standalone: true,
  imports: [NgFor, NgIf, AsyncPipe, MatTabsModule, DynamicDataLayersComponent],
  templateUrl: './map-tabs.component.html',
  styleUrl: './map-tabs.component.scss',
})
export class MapTabsComponent {
  layoutMode$ = this.multiMapConfigState.layoutMode$;
  mapsArray$ = this.dataLayersRegistryService.size$.pipe(
    startWith(0),
    delay(0),
    map((size) =>
      Array.from({ length: size }, (_, mapNumber) => mapNumber + 1)
    ),
    // the tabs re-render with each map's panel; they need the maps right away
    shareReplay(1)
  );

  selectedMapId$ = this.multiMapConfigState.selectedMapId$;

  constructor(
    private multiMapConfigState: MultiMapConfigState,
    private dataLayersRegistryService: DataLayersRegistryService
  ) {}

  selectMap(mapId: number) {
    this.multiMapConfigState.setSelectedMap(mapId);
  }
}
