import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { ScenarioRoutingModule } from './scenario-routing.module';
import { MapConfigState } from '@maplibre-map/map-config.state';
import { MapConfigService } from '@maplibre-map/map-config.service';
import { USE_GEOMETRY } from '@data-layers/data-layers/geometry-datalayers.token';

@NgModule({
  imports: [CommonModule, ScenarioRoutingModule],
  providers: [
    DataLayersStateService,
    MapConfigState,
    MapConfigService,
    // Narrow data and base layers to the planning area
    { provide: USE_GEOMETRY, useValue: true },
  ],
})
export class ScenarioModule {}
