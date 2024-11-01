import { Component } from '@angular/core';
import { DirectImpactsMapComponent } from '../direct-impacts-map/direct-impacts-map.component';
import { Map as MapLibreMap } from 'maplibre-gl';
import { syncMaps } from '../maplibre.helper';
import { ControlComponent } from '@maplibre/ngx-maplibre-gl';

@Component({
  selector: 'app-direct-impacts-synced-maps',
  standalone: true,
  imports: [DirectImpactsMapComponent, ControlComponent],
  templateUrl: './direct-impacts-synced-maps.component.html',
  styleUrl: './direct-impacts-synced-maps.component.scss',
})
export class DirectImpactsSyncedMapsComponent {
  private maps: MapLibreMap[] = [];

  buttons = [
    { icon: 'layers', actionName: 'layers' },
    { icon: 'expand', actionName: 'expand' },
  ];

  mapCreated(map: MapLibreMap) {
    this.maps.push(map);
    if (this.maps.length === 4) {
      //sync
      syncMaps(this.maps[0], this.maps[1], this.maps[2], this.maps[3]);
    }
  }
}
