import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { ScenarioRoutingModule } from './scenario-routing.module';
import { MapConfigState } from '@maplibre/map-config.state';
import { MapConfigService } from '@maplibre/map-config.service';

@NgModule({
  imports: [CommonModule, ScenarioRoutingModule],
  providers: [DataLayersStateService, MapConfigState, MapConfigService],
})
export class ScenarioModule {}
