import { Component, HostListener, OnDestroy } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { Map as MapLibreMap } from 'maplibre-gl';
import {
  Cleanup,
  getExtentFromLngLatBounds,
  syncMaps,
} from '@app/maplibre-map/maplibre.helper';
import { ExploreMapComponent } from '@app/maplibre-map/explore-map/explore-map.component';
import { MultiMapConfigState } from '@app/maplibre-map/multi-map-config.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-synced-maps',
  standalone: true,
  imports: [ExploreMapComponent, NgIf, NgClass],
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
    const map1 = this.maps.get(1);
    if (!map1) {
      return;
    }
    const bounds = map1.getBounds();

    this.multiMapConfigState.saveStateToLocalStorage(
      getExtentFromLngLatBounds(bounds)
    );
  }
}
