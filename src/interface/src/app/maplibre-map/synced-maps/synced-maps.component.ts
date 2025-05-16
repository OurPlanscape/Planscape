import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { Map as MapLibreMap } from 'maplibre-gl';
import { Cleanup, syncMaps } from '../maplibre.helper';
import { ExploreMapComponent } from '../explore-map/explore-map.component';
import { MultiMapConfigState } from '../multi-map-config.state';

@Component({
  selector: 'app-synced-maps',
  standalone: true,
  imports: [AsyncPipe, MapComponent, ExploreMapComponent, NgIf],
  templateUrl: './synced-maps.component.html',
  styleUrl: './synced-maps.component.scss',
})
export class SyncedMapsComponent {
  private maps = new Map<number, MapLibreMap>();

  views$ = this.multiMapConfigState.views$;

  cleanupFn: Cleanup | null = null;

  constructor(private multiMapConfigState: MultiMapConfigState) {}

  async mapCreated(event: { map: MapLibreMap; mapNumber: number }) {
    this.maps.set(event.mapNumber, event.map);

    if (this.cleanupFn) {
      this.cleanupFn();
    }

    this.cleanupFn = syncMaps(...this.maps.values());
  }
}
