import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataLayersStateService } from '../data-layers/data-layers.state.service';
import { ScenarioRoutingModule } from './scenario-routing.module';
import { ScenarioComponent } from './scenario.component';
import { ScenarioMapComponent } from '../maplibre-map/scenario-map/scenario-map.component';
import { MapConfigState } from '../maplibre-map/map-config.state';
import { MapConfigService } from '../maplibre-map/map-config.service';
import { SharedModule } from '@shared';
import { GoalOverlayComponent } from '../plan/goal-overlay/goal-overlay.component';

@NgModule({
  declarations: [ScenarioComponent],
  imports: [
    CommonModule,
    ScenarioRoutingModule,
    ScenarioMapComponent,
    SharedModule,
    GoalOverlayComponent,
  ],
  providers: [DataLayersStateService, MapConfigState, MapConfigService],
})
export class ScenarioModule {}
