import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { ScenarioRoutingModule } from '@app/scenario/scenario-routing.module';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { MapConfigService } from '@app/maplibre-map/map-config.service';

@NgModule({
  imports: [CommonModule, ScenarioRoutingModule],
  providers: [DataLayersStateService, MapConfigState, MapConfigService],
})
export class ScenarioModule {}
