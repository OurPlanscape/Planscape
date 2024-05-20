import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './map.component';
import { LayerInfoCardComponent } from './layer-info-card/layer-info-card.component';
import { MapControlPanelComponent } from './map-control-panel/map-control-panel.component';
import { MapNameplateComponent } from './map-nameplate/map-nameplate.component';
import { PlanCreateDialogComponent } from './plan-create-dialog/plan-create-dialog.component';
import { ProjectCardComponent } from './project-card/project-card.component';
import { SignInDialogComponent } from './sign-in-dialog/sign-in-dialog.component';
import { SharedModule } from '@shared';
import { StringifyMapConfigPipe } from './stringify-map-config.pipe';
import { LegacyMaterialModule } from '../material/legacy-material.module';
import { RegionDropdownComponent } from './region-dropdown/region-dropdown.component';
import { MapConfigSummaryComponent } from './map-config-summary/map-config-summary.component';
import { ConditionTreeComponent } from './map-control-panel/condition-tree/condition-tree.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FeaturesModule } from '../features/features.module';
import { OutsideRegionDialogComponent } from './outside-region-dialog/outside-region-dialog.component';
import { InvalidLinkDialogComponent } from './invalid-link-dialog/invalid-link-dialog.component';

@NgModule({
  declarations: [
    MapComponent,
    LayerInfoCardComponent,
    MapControlPanelComponent,
    MapNameplateComponent,
    PlanCreateDialogComponent,
    ProjectCardComponent,
    SignInDialogComponent,
    StringifyMapConfigPipe,
    RegionDropdownComponent,
    MapConfigSummaryComponent,
    ConditionTreeComponent,
    OutsideRegionDialogComponent,
    InvalidLinkDialogComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    LegacyMaterialModule,
    FormsModule,
    ReactiveFormsModule,
    FeaturesModule,
  ],
  exports: [MapComponent],
})
export class MapModule {}
