import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from 'src/app/material/material.module';
import { RouterModule } from '@angular/router';
import { HttpClientXsrfModule } from '@angular/common/http';
import { SharedModule } from './../shared/shared.module';
import { ConstraintsPanelComponent } from './create-scenarios/constraints-panel/constraints-panel.component';
import { CreateScenariosComponent } from './create-scenarios/create-scenarios.component';
import { IdentifyProjectAreasComponent } from './create-scenarios/identify-project-areas/identify-project-areas.component';
import { SetPrioritiesComponent } from './create-scenarios/set-priorities/set-priorities.component';
import { PlanMapComponent } from './plan-map/plan-map.component';
import { PlanNavigationBarComponent } from './plan-navigation-bar/plan-navigation-bar.component';
import { PlanOverviewComponent } from './plan-summary/plan-overview/plan-overview.component';
import { SavedScenariosComponent } from './plan-summary/saved-scenarios/saved-scenarios.component';
import { SummaryPanelComponent } from './plan-summary/summary-panel/summary-panel.component';
import { PlanUnavailableComponent } from './plan-unavailable/plan-unavailable.component';
import { PlanComponent } from './plan.component';
import { FeaturesModule } from '../features/features.module';
import { WINDOW_PROVIDERS } from '../services/window.service';
import { ScenarioNotStartedComponent } from './scenario-not-started/scenario-not-started.component';
import { ScenarioPendingComponent } from './scenario-pending/scenario-pending.component';
import { ScenarioResultsComponent } from './scenario-results/scenario-results.component';
import { ProjectAreasComponent } from './project-areas/project-areas.component';
import { ProjectAreasMetricsComponent } from './project-areas-metrics/project-areas-metrics.component';
import { ReportChartComponent } from './report-chart/report-chart.component';
import { NgChartsModule } from 'ng2-charts';
import { ScenarioFailureComponent } from './scenario-failure/scenario-failure.component';
import { ExploreComponent } from './explore/explore/explore.component';
import { MapModule } from '../map/map.module';
import { ScenarioTooltipComponent } from './create-scenarios/tooltips/scenario-tooltip.component';
import { NgxMaskModule } from 'ngx-mask';

/** Components used in the plan flow. */
@NgModule({
  declarations: [
    PlanComponent,
    PlanMapComponent,
    SavedScenariosComponent,
    SummaryPanelComponent,
    PlanUnavailableComponent,
    PlanOverviewComponent,
    CreateScenariosComponent,
    PlanNavigationBarComponent,
    SetPrioritiesComponent,
    ConstraintsPanelComponent,
    IdentifyProjectAreasComponent,
    ScenarioNotStartedComponent,
    ScenarioPendingComponent,
    ScenarioResultsComponent,
    ProjectAreasComponent,
    ProjectAreasMetricsComponent,
    ReportChartComponent,
    ScenarioFailureComponent,
    ExploreComponent,
    ScenarioTooltipComponent,
  ],
  providers: [WINDOW_PROVIDERS],
  imports: [
    BrowserAnimationsModule,
    CommonModule,
    FormsModule,
    HttpClientXsrfModule.withOptions({
      cookieName: 'csrftoken',
      headerName: 'X-CSRFToken',
    }),
    MatButtonToggleModule,
    MaterialModule,
    ReactiveFormsModule,
    RouterModule,
    SharedModule,
    FeaturesModule,
    NgChartsModule,
    MapModule,
    NgxMaskModule.forRoot(),
  ],
})
export class PlanModule {}
