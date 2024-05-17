import { AreaDetailsComponent } from './area-details/area-details.component';
import { AreaNotesComponent } from './area-notes/area-notes.component';
import { CommonModule } from '@angular/common';
import { ConstraintsPanelComponent } from './create-scenarios/constraints-panel/constraints-panel.component';
import { CreateScenariosComponent } from './create-scenarios/create-scenarios.component';
import { ExploreComponent } from './explore/explore/explore.component';
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
import { PlanMapComponent } from './plan-map/plan-map.component';
import { PlanNavigationBarComponent } from './plan-navigation-bar/plan-navigation-bar.component';
import { PlanOverviewComponent } from './plan-summary/plan-overview/plan-overview.component';
import { ProjectAreasComponent } from './project-areas/project-areas.component';
import { ProjectAreasMetricsComponent } from './project-areas-metrics/project-areas-metrics.component';
import { ReportChartComponent } from './report-chart/report-chart.component';
import { ResourceUnavailableComponent } from './resource-unavailable/resource-unavailable.component';
import { RouterModule } from '@angular/router';
import { SavedScenariosComponent } from './plan-summary/saved-scenarios/saved-scenarios.component';
import { ScenarioFailureComponent } from './scenario-failure/scenario-failure.component';
import { ScenarioNotStartedComponent } from './scenario-not-started/scenario-not-started.component';
import { ScenarioPendingComponent } from './scenario-pending/scenario-pending.component';
import { ScenarioResultsComponent } from './scenario-results/scenario-results.component';
import { ScenarioTooltipComponent } from './create-scenarios/tooltips/scenario-tooltip.component';
import { ScenariosTableListComponent } from './plan-summary/scenarios-table-list/scenarios-table-list.component';
import { SetPrioritiesComponent } from './create-scenarios/set-priorities/set-priorities.component';
import { SharedModule } from '@shared';
import { SummaryPanelComponent } from './plan-summary/summary-panel/summary-panel.component';
import { WINDOW_PROVIDERS } from '@services';
import { GoalOverlayComponent } from './create-scenarios/goal-overlay/goal-overlay.component';
import { DeleteNoteDialogComponent } from './delete-note-dialog/delete-note-dialog.component';
import { PlanRoutingModule } from './plan-routing.module';
import { ButtonComponent } from '@styleguide';
import { DeleteDialogComponent } from '../standalone/delete-dialog/delete-dialog.component';

/** Components used in the plan flow. */
@NgModule({
  declarations: [
    AreaDetailsComponent,
    AreaNotesComponent,
    ConstraintsPanelComponent,
    CreateScenariosComponent,
    DeleteNoteDialogComponent,
    ExploreComponent,
    GoalOverlayComponent,
    IdentifyProjectAreasComponent,
    PlanComponent,
    PlanMapComponent,
    PlanNavigationBarComponent,
    PlanOverviewComponent,
    ProjectAreasComponent,
    ProjectAreasMetricsComponent,
    ReportChartComponent,
    ResourceUnavailableComponent,
    SavedScenariosComponent,
    ScenarioFailureComponent,
    ScenarioNotStartedComponent,
    ScenarioPendingComponent,
    ScenarioResultsComponent,
    ScenarioTooltipComponent,
    ScenariosTableListComponent,
    SetPrioritiesComponent,
    SummaryPanelComponent,
  ],
  providers: [WINDOW_PROVIDERS],
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
  ],
})
export class PlanModule {}
