import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material/material.module';

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
  ],
  imports: [CommonModule, FormsModule, MaterialModule],
})
export class PlanModule {}
