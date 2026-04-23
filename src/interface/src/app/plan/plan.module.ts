import { PlanningAnalyticsToolsComponent } from '@plan/analytics-tools/planning-analytics-tools.component';
import { AreaNotesComponent } from '@plan/area-notes/area-notes.component';
import { CommonModule } from '@angular/common';
import { FeaturesModule } from '@features/features.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientXsrfModule } from '@angular/common/http';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { LegacyMaterialModule } from '@material/legacy-material.module';
import { NgChartsModule } from 'ng2-charts';
import { NgModule } from '@angular/core';
import { NgxMaskModule } from 'ngx-mask';
import { PlanComponent } from './plan.component';
import { ResourceUnavailableComponent } from '@shared/resource-unavailable/resource-unavailable.component';
import { RouterModule } from '@angular/router';
import { SharedModule } from '@shared';
import { WINDOW_PROVIDERS } from '@services';
import { PlanRoutingModule } from './plan-routing.module';
import {
  BannerComponent,
  ButtonComponent,
  NotesPanelComponent,
  OpacitySliderComponent,
  OverlayLoaderComponent,
  ScenarioCardComponent,
  SectionComponent,
  ToggleComponent,
  TreatmentCardComponent,
} from '@styleguide';
import { DeleteDialogComponent } from '@standalone/delete-dialog/delete-dialog.component';
import { UploadProjectAreasModalComponent } from '@plan/upload-project-areas-modal/upload-project-areas-modal.component';
import { ScenariosCardListComponent } from '@plan/plan-summary/scenarios-card-list/scenarios-card-list.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MapConfigState } from '@maplibre-map/map-config.state';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { MapConfigService } from '@maplibre-map/map-config.service';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MapViewerCardComponent } from './map-viewer-card/map-viewer-card.component';
import { NotesExpansionCardComponent } from './notes-expansion-card/notes-expansion-card.component';
import { PlanScenariosListComponent } from './plan-summary/plan-scenarios-list/plan-scenarios-list.component';
import { ScenariosEmptyListComponent } from './plan-summary/scenarios-empty-list/scenarios-empty-list.component';
import { DetailsCardComponent } from '@styleguide/details-card/details-card.component';
import { DashboardLayoutComponent } from '@styleguide/dashboard-layout/dashboard-layout.component';
import { NavBarComponent } from '@app/shared/nav-bar/nav-bar.component';

/** Components used in the plan flow. */
@NgModule({
  declarations: [AreaNotesComponent, PlanComponent, PlanScenariosListComponent],
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
    ScenarioCardComponent,
    ScenariosCardListComponent,
    TreatmentCardComponent,
    NotesPanelComponent,
    OpacitySliderComponent,
    MatTabsModule,
    DataLayersComponent,
    SectionComponent,
    ResourceUnavailableComponent,
    BaseLayersComponent,
    BannerComponent,
    MatProgressSpinnerModule,
    MatCardModule,
    MapViewerCardComponent,
    DetailsCardComponent,
    NotesExpansionCardComponent,
    ToggleComponent,
    ScenariosEmptyListComponent,
    OverlayLoaderComponent,
    DashboardLayoutComponent,
    NavBarComponent,
  ],
})
export class PlanModule {}
