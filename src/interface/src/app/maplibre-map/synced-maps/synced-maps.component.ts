import { Component, HostListener, Inject, OnDestroy } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { Map as MapLibreMap } from 'maplibre-gl';
import {
  Cleanup,
  getExtentFromLngLatBounds,
  syncMaps,
} from '../maplibre.helper';
import { SyncedMapComponent } from '@maplibre-map/synced-map/synced-map.component';
import { MultiMapConfigState } from '../multi-map-config.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MULTIMAP_STORAGE } from '@app/services/multimap-storage.token';
import { TerraDrawPolygonMode, TerraDrawSelectMode } from 'terra-draw';
import { DefaultSelectConfig, DrawService } from '../draw.service';

@UntilDestroy()
@Component({
  selector: 'app-synced-maps',
  standalone: true,
  imports: [SyncedMapComponent, NgIf, NgClass],
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

  constructor(
    private multiMapConfigState: MultiMapConfigState,
    @Inject(MULTIMAP_STORAGE)
    private readonly multiDataLayerView: boolean,
    private drawService: DrawService,
  ) {
    // This logic only applies when multiDataLayerView is enabled
    if (this.multiDataLayerView) {
      this.multiMapConfigState.loadStateFromLocalStorage();
    }

    this.multiMapConfigState.layoutMode$
      .pipe(untilDestroyed(this))
      .subscribe((layoutOption) => (this.layoutMode = layoutOption));
  }

  async mapCreated(event: { map: MapLibreMap; mapNumber: number }) {

    this.maps.set(event.mapNumber, event.map);
    console.log('we are creating a map:', event.map);
    console.log('and it is map number:', event.mapNumber);
    console.log('the current collection of maps is:', this.maps);
    if (this.cleanupFn) {
      this.cleanupFn();
    }

    this.cleanupFn = syncMaps(...this.maps.values());
  }

  initDrawingModel(map: MapLibreMap) {
   // designate this map instance as the drawing reference
        const polygonMode = new TerraDrawPolygonMode({
          styles: {
            fillColor: '#A5C8D7',
            fillOpacity: 0.5,
            outlineColor: '#000000',
            outlineWidth: 2,
            closingPointColor: '#ffffff',
            closingPointWidth: 6,
            closingPointOutlineColor: '#0000ee',
            closingPointOutlineWidth: 2,
          },
          pointerDistance: 10, // reduce snap distance / auto-finish sensitivity
        });
        const selectMode = new TerraDrawSelectMode(DefaultSelectConfig);
        this.drawService.initializeTerraDraw(map, [
          polygonMode,
          selectMode,
        ]);
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

    if (this.multiDataLayerView) {
      this.multiMapConfigState.saveStateToLocalStorage(
        getExtentFromLngLatBounds(bounds)
      );
    }
  }
}
