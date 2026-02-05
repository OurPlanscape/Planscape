import { PlanningAnalyticsToolsComponent } from '@app/plan/analytics-tools/planning-analytics-tools.component';
import { AreaNotesComponent } from '@app/plan/area-notes/area-notes.component';
import { CommonModule } from '@angular/common';
import { FeaturesModule } from '@app/features/features.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientXsrfModule } from '@angular/common/http';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { LegacyMaterialModule } from '@app/material/legacy-material.module';
import { NgChartsModule } from 'ng2-charts';
import { NgModule } from '@angular/core';
import { NgxMaskModule } from 'ngx-mask';
import { PlanComponent } from '@app/plan/plan.component';
import { ResourceUnavailableComponent } from '@shared/resource-unavailable/resource-unavailable.component';
import { RouterModule } from '@angular/router';
import { SavedScenariosComponent } from '@app/plan/plan-summary/saved-scenarios/saved-scenarios.component';
import { SharedModule } from '@shared';
import { WINDOW_PROVIDERS } from '@services';
import { PlanRoutingModule } from '@app/plan/plan-routing.module';
import {
  BannerComponent,
  ButtonComponent,
  NotesSidebarComponent,
  OpacitySliderComponent,
  ScenarioCardComponent,
  SectionComponent,
  TreatmentCardComponent,
} from '@styleguide';
import { DeleteDialogComponent } from '@app/standalone/delete-dialog/delete-dialog.component';
import { UploadProjectAreasModalComponent } from '@app/plan/upload-project-areas-modal/upload-project-areas-modal.component';
import { PlanningAreaTitlebarMenuComponent } from '@app/standalone/planning-area-titlebar-menu/planning-area-titlebar-menu.component';
import { ScenariosCardListComponent } from '@app/plan/plan-summary/scenarios-card-list/scenarios-card-list.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { DataLayersComponent } from '@app/data-layers/data-layers/data-layers.component';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import { BaseLayersComponent } from '@app/base-layers/base-layers/base-layers.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';

/** Components used in the plan flow. */
@NgModule({
  declarations: [AreaNotesComponent, PlanComponent, SavedScenariosComponent],
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
    PlanningAnalyticsToolsComponent,
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
    MatProgressSpinnerModule,
    MatCardModule,
  ],
})
export class PlanModule {}
