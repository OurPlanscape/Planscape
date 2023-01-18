import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from 'src/app/material/material.module';

import { SharedModule } from './../shared/shared.module';
import { CreateScenariosIntroComponent } from './create-scenarios/create-scenarios-intro/create-scenarios-intro.component';
import { CreateScenariosComponent } from './create-scenarios/create-scenarios.component';
import { SetPrioritiesComponent } from './create-scenarios/set-priorities/set-priorities.component';
import { PlanBottomBarComponent } from './plan-bottom-bar/plan-bottom-bar.component';
import { PlanMapComponent } from './plan-map/plan-map.component';
import { PlanOverviewComponent } from './plan-summary/plan-overview/plan-overview.component';
import { SavedScenariosComponent } from './plan-summary/saved-scenarios/saved-scenarios.component';
import { SummaryPanelComponent } from './plan-summary/summary-panel/summary-panel.component';
import { UnsavedScenariosComponent } from './plan-summary/unsaved-scenarios/unsaved-scenarios.component';
import { DeletePlanDialogComponent } from './plan-table/delete-plan-dialog/delete-plan-dialog.component';
import { PlanTableComponent } from './plan-table/plan-table.component';
import { PlanUnavailableComponent } from './plan-unavailable/plan-unavailable.component';
import { PlanComponent } from './plan.component';
import { ProgressPanelComponent } from './progress-panel/progress-panel.component';

/** Components used in the plan flow. */
@NgModule({
  declarations: [
    PlanComponent,
    PlanMapComponent,
    ProgressPanelComponent,
    SavedScenariosComponent,
    SummaryPanelComponent,
    UnsavedScenariosComponent,
    PlanUnavailableComponent,
    PlanTableComponent,
    DeletePlanDialogComponent,
    PlanOverviewComponent,
    CreateScenariosComponent,
    PlanBottomBarComponent,
    SetPrioritiesComponent,
    CreateScenariosIntroComponent,
  ],
  imports: [
    BrowserAnimationsModule,
    CommonModule,
    FormsModule,
    MaterialModule,
    SharedModule,
  ],
})
export class PlanModule {}
