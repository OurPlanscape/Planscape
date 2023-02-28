import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from 'src/app/material/material.module';
import { RouterModule } from '@angular/router';

import { SharedModule } from './../shared/shared.module';
import { ConstraintsPanelComponent } from './create-scenarios/constraints-panel/constraints-panel.component';
import { CreateScenariosComponent } from './create-scenarios/create-scenarios.component';
import { GenerateScenariosComponent } from './create-scenarios/generate-scenarios/generate-scenarios.component';
import { IdentifyProjectAreasComponent } from './create-scenarios/identify-project-areas/identify-project-areas.component';
import { SetPrioritiesComponent } from './create-scenarios/set-priorities/set-priorities.component';
import { PlanMapComponent } from './plan-map/plan-map.component';
import { PlanNavigationBarComponent } from './plan-navigation-bar/plan-navigation-bar.component';
import { PlanOverviewComponent } from './plan-summary/plan-overview/plan-overview.component';
import { SavedScenariosComponent } from './plan-summary/saved-scenarios/saved-scenarios.component';
import { ScenarioConfigurationsComponent } from './plan-summary/scenario-configurations/scenario-configurations.component';
import { SummaryPanelComponent } from './plan-summary/summary-panel/summary-panel.component';
import { DeletePlanDialogComponent } from './plan-table/delete-plan-dialog/delete-plan-dialog.component';
import { PlanTableComponent } from './plan-table/plan-table.component';
import { PlanUnavailableComponent } from './plan-unavailable/plan-unavailable.component';
import { PlanComponent } from './plan.component';
import { ScenarioDetailsComponent } from './scenario-details/scenario-details.component';
import { OutcomeComponent } from './scenario-details/outcome/outcome.component';
import { ScenarioConfirmationComponent } from './scenario-confirmation/scenario-confirmation.component';

/** Components used in the plan flow. */
@NgModule({
  declarations: [
    PlanComponent,
    PlanMapComponent,
    SavedScenariosComponent,
    SummaryPanelComponent,
    ScenarioConfigurationsComponent,
    PlanUnavailableComponent,
    PlanTableComponent,
    DeletePlanDialogComponent,
    PlanOverviewComponent,
    CreateScenariosComponent,
    PlanNavigationBarComponent,
    SetPrioritiesComponent,
    ConstraintsPanelComponent,
    IdentifyProjectAreasComponent,
    GenerateScenariosComponent,
    ScenarioDetailsComponent,
    OutcomeComponent,
    ScenarioConfirmationComponent,
  ],
  imports: [
    BrowserAnimationsModule,
    CommonModule,
    FormsModule,
    MaterialModule,
    ReactiveFormsModule,
    RouterModule,
    SharedModule,
  ],
})
export class PlanModule {}
