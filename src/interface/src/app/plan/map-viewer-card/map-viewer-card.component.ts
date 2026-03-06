import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PlanningAreaLayerComponent } from '@app/maplibre-map/planning-area-layer/planning-area-layer.component';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { Map as MapLibreMap } from 'maplibre-gl';
import { DEFAULT_BASE_MAP } from '@app/types';
import { AsyncPipe, NgIf } from '@angular/common';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import { PlanState } from '../plan.state';

@Component({
  selector: 'app-map-viewer-card',
  standalone: true,
  imports: [
    AsyncPipe,
    MapComponent,
    MatIconModule,
    NgIf,
    PlanningAreaLayerComponent,
  ],
  providers: [MapConfigState],
  templateUrl: './map-viewer-card.component.html',
  styleUrl: './map-viewer-card.component.scss',
})
export class MapViewerCardComponent {
  mapLibreMap!: MapLibreMap;
  baseMapUrl$ = this.mapConfigState.baseMapUrl$;
  currentPlan$ = this.planState.currentPlan$;

  constructor(
    private mapConfigState: MapConfigState,
    private mapConfigService: MapConfigService,
    private planState: PlanState
  ) {
    this.mapConfigService.initialize();
    this.mapConfigState.setShowMapControls(false);
    this.mapConfigState.updateBaseMap(DEFAULT_BASE_MAP);
  }
}
