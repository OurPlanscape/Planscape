import { AreaNotesComponent } from './area-notes/area-notes.component';
import { CommonModule } from '@angular/common';
import { ConstraintsPanelComponent } from './create-scenarios/constraints-panel/constraints-panel.component';
import { CreateScenariosComponent } from './create-scenarios/create-scenarios.component';
import { ExploreLegacyComponent } from './explore/explore/explore-legacy.component';
import { FeaturesModule } from '../features/features.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientXsrfModule } from '@angular/common/http';
import { IdentifyProjectAreasComponent } from './create-scenarios/identify-project-areas/identify-project-areas.component';
import { MapModule } from '../map/map.module';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { LegacyMaterialModule } from '../material/legacy-material.module';
import { NgChartsModule } from 'ng2-charts';
import { NgModule } from '@angular/core';
import { NgxMaskModule } from 'ngx-mask';
import { PlanComponent } from './plan.component';
import { PlanNavigationBarComponent } from './plan-navigation-bar/plan-navigation-bar.component';
import { PlanOverviewComponent } from './plan-summary/plan-overview/plan-overview.component';
import { ProjectAreasComponent } from './project-areas/project-areas.component';
import { ReportChartComponent } from './report-chart/report-chart.component';
import { ResourceUnavailableComponent } from './resource-unavailable/resource-unavailable.component';
import { RouterModule } from '@angular/router';
import { SavedScenariosComponent } from './plan-summary/saved-scenarios/saved-scenarios.component';
import { ScenarioFailureComponent } from './scenario-failure/scenario-failure.component';
import { ScenarioPendingComponent } from './scenario-pending/scenario-pending.component';
import { ScenarioResultsComponent } from './scenario-results/scenario-results.component';
import { ScenariosTableListComponent } from './plan-summary/scenarios-table-list/scenarios-table-list.component';
import { SetPrioritiesComponent } from './create-scenarios/set-priorities/set-priorities.component';
import { SharedModule } from '@shared';

import { WINDOW_PROVIDERS } from '@services';
import { GoalOverlayComponent } from './create-scenarios/goal-overlay/goal-overlay.component';
import { DeleteNoteDialogComponent } from './delete-note-dialog/delete-note-dialog.component';
import { PlanRoutingModule } from './plan-routing.module';
import { ButtonComponent, OpacitySliderComponent } from '@styleguide';
import { DeleteDialogComponent } from '../standalone/delete-dialog/delete-dialog.component';
import { UploadProjectAreasModalComponent } from './upload-project-areas-modal/upload-project-areas-modal.component';
import { PlanningAreaTitlebarMenuComponent } from '../standalone/planning-area-titlebar-menu/planning-area-titlebar-menu.component';
import { ScenarioCardComponent } from '../../styleguide/scenario-card/scenario-card.component';
import { ScenariosCardListComponent } from './plan-summary/scenarios-card-list/scenarios-card-list.component';
import { NotesSidebarComponent } from '../../styleguide/notes-sidebar/notes-sidebar.component';
import { TreatmentCardComponent } from '../../styleguide/treatment-card/treatment-card.component';
import { TreatmentsTabComponent } from './create-scenarios/treatments-tab/treatments-tab.component';
import { UploadedScenarioViewComponent } from './uploaded-scenario-view/uploaded-scenario-view.component';
import { ScenarioRoutePlaceholderComponent } from './scenario-route-placeholder/scenario-route-placeholder';
import { MatTabsModule } from '@angular/material/tabs';
import { MapConfigState } from '../maplibre-map/map-config.state';
import { ScenarioMapComponent } from '../maplibre-map/scenario-map/scenario-map.component';
import { PlanTabsFooterComponent } from './plan-tabs-footer/plan-tabs-footer.component';
import { DataLayersComponent } from '../data-layers/data-layers/data-layers.component';
import { DataLayersStateService } from '../data-layers/data-layers.state.service';
import { MapConfigService } from '../maplibre-map/map-config.service';
import { CollapsiblePanelComponent } from '../../styleguide/collapsible-panel/collapsible-panel.component';
import { ScenarioMetricsLegendComponent } from './scenario-results/scenario-metrics-legend/scenario-metrics-legend.component';

/** Components used in the plan flow. */
@NgModule({
  declarations: [
    AreaNotesComponent,
    ConstraintsPanelComponent,
    CreateScenariosComponent,
    DeleteNoteDialogComponent,
    ExploreLegacyComponent,
    GoalOverlayComponent,
    IdentifyProjectAreasComponent,
    PlanComponent,
    PlanNavigationBarComponent,
    PlanOverviewComponent,
    ProjectAreasComponent,
    ReportChartComponent,
    ResourceUnavailableComponent,
    SavedScenariosComponent,
    ScenarioFailureComponent,
    ScenarioPendingComponent,
    ScenarioResultsComponent,
    ScenarioRoutePlaceholderComponent,
    ScenariosTableListComponent,
    SetPrioritiesComponent,
    TreatmentsTabComponent,
    UploadedScenarioViewComponent,
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
    MapModule,
    MatButtonToggleModule,
    LegacyMaterialModule,
    NgChartsModule,
    NgxMaskModule.forRoot(),
    ReactiveFormsModule,
    PlanRoutingModule,
    RouterModule,
    SharedModule,
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
    ScenarioMapComponent,
    PlanTabsFooterComponent,
    DataLayersComponent,
    CollapsiblePanelComponent,
    ScenarioMetricsLegendComponent,
  ],
})
export class PlanModule {}
