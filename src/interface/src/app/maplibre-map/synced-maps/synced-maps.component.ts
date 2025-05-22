import { Component, HostListener, OnDestroy } from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { Map as MapLibreMap } from 'maplibre-gl';
import { Cleanup, syncMaps } from '../maplibre.helper';
import { ExploreMapComponent } from '../explore-map/explore-map.component';
import { MultiMapConfigState } from '../multi-map-config.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-synced-maps',
  standalone: true,
  imports: [AsyncPipe, MapComponent, ExploreMapComponent, NgIf, NgClass],
  templateUrl: './synced-maps.component.html',
  styleUrl: './synced-maps.component.scss',
})
export class SyncedMapsComponent implements OnDestroy {
  private maps = new Map<number, MapLibreMap>();

  layoutMode = 1;
  cleanupFn: Cleanup | null = null;

  @HostListener('window:beforeunload')
  beforeUnload() {
    this.saveState();
  }

  constructor(private multiMapConfigState: MultiMapConfigState) {
    this.multiMapConfigState.loadStateFromLocalStorage();

    this.multiMapConfigState.layoutMode$
      .pipe(untilDestroyed(this))
      .subscribe((layoutOption) => (this.layoutMode = layoutOption));
  }

  async mapCreated(event: { map: MapLibreMap; mapNumber: number }) {
    this.maps.set(event.mapNumber, event.map);

    if (this.cleanupFn) {
      this.cleanupFn();
    }

    this.cleanupFn = syncMaps(...this.maps.values());
  }

  ngOnDestroy() {
    this.saveState();
  }

  saveState() {
    this.multiMapConfigState.saveStateToLocalStorage({});
  }
}
