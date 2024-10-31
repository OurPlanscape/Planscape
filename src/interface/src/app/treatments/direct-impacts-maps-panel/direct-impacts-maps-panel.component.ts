import { Component } from '@angular/core';
import { DirectImpactsMapComponent } from '../direct-impacts-map/direct-impacts-map.component';
import { Map as MapLibreMap } from 'maplibre-gl';
import { syncMaps } from '../maplibre.helper';
import { PanelComponent } from '../../../styleguide/panel/panel.component';
import { ControlComponent } from '@maplibre/ngx-maplibre-gl';

@Component({
  selector: 'app-direct-impacts-maps-panel',
  standalone: true,
  imports: [DirectImpactsMapComponent, PanelComponent, ControlComponent],
  templateUrl: './direct-impacts-maps-panel.component.html',
  styleUrl: './direct-impacts-maps-panel.component.scss',
})
export class DirectImpactsMapsPanelComponent {
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
