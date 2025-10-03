import { AnalyticsToolsComponent } from './analytics-tools/analytics-tools.component';
import { AreaNotesComponent } from './area-notes/area-notes.component';
import { CommonModule } from '@angular/common';
import { FeaturesModule } from '../features/features.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientXsrfModule } from '@angular/common/http';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { LegacyMaterialModule } from '../material/legacy-material.module';
import { NgChartsModule } from 'ng2-charts';
import { NgModule } from '@angular/core';
import { NgxMaskModule } from 'ngx-mask';
import { PlanComponent } from './plan.component';
import { ResourceUnavailableComponent } from '../shared/resource-unavailable/resource-unavailable.component';
import { RouterModule } from '@angular/router';
import { SavedScenariosComponent } from './plan-summary/saved-scenarios/saved-scenarios.component';
import { SharedModule } from '@shared';
import { WINDOW_PROVIDERS } from '@services';
import { DeleteNoteDialogComponent } from './delete-note-dialog/delete-note-dialog.component';
import { PlanRoutingModule } from './plan-routing.module';
import {
  BannerComponent,
  ButtonComponent,
  NotesSidebarComponent,
  OpacitySliderComponent,
  ScenarioCardComponent,
  SectionComponent,
  TreatmentCardComponent,
} from '@styleguide';
import { DeleteDialogComponent } from '../standalone/delete-dialog/delete-dialog.component';
import { UploadProjectAreasModalComponent } from './upload-project-areas-modal/upload-project-areas-modal.component';
import { PlanningAreaTitlebarMenuComponent } from '../standalone/planning-area-titlebar-menu/planning-area-titlebar-menu.component';
import { ScenariosCardListComponent } from './plan-summary/scenarios-card-list/scenarios-card-list.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MapConfigState } from '../maplibre-map/map-config.state';
import { DataLayersComponent } from '../data-layers/data-layers/data-layers.component';
import { DataLayersStateService } from '../data-layers/data-layers.state.service';
import { MapConfigService } from '../maplibre-map/map-config.service';
import { BaseLayersComponent } from '../base-layers/base-layers/base-layers.component';

/** Components used in the plan flow. */
@NgModule({
  declarations: [
    AreaNotesComponent,
    DeleteNoteDialogComponent,
    PlanComponent,
    SavedScenariosComponent,
  ],
  providers: [
    WINDOW_PROVIDERS,
    MapConfigState,
    DataLayersStateService,
    MapConfigService,
  ],
  imports: [
    CommonModule,
    FormsModule,
    FeaturesModule,
    HttpClientXsrfModule.withOptions({
      cookieName: 'csrftoken',
      headerName: 'X-CSRFToken',
    }),
    MatButtonToggleModule,
    LegacyMaterialModule,
    NgChartsModule,
    NgxMaskModule.forRoot(),
    ReactiveFormsModule,
    PlanRoutingModule,
    RouterModule,
    SharedModule,
    AnalyticsToolsComponent,
    ButtonComponent,
    DeleteDialogComponent,
    UploadProjectAreasModalComponent,
    PlanningAreaTitlebarMenuComponent,
    ScenarioCardComponent,
    ScenariosCardListComponent,
    TreatmentCardComponent,
    NotesSidebarComponent,
    OpacitySliderComponent,
    MatTabsModule,
    DataLayersComponent,
    SectionComponent,
    ResourceUnavailableComponent,
    BaseLayersComponent,
    BannerComponent,
  ],
})
export class PlanModule {}
