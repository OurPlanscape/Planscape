import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MaterialModule } from 'src/app/material/material.module';

import { PlanMapComponent } from './plan-map/plan-map.component';
import { PlanComponent } from './plan.component';
import { ProgressPanelComponent } from './progress-panel/progress-panel.component';
import { SavedScenariosComponent } from './saved-scenarios/saved-scenarios.component';
import { SummaryPanelComponent } from './summary-panel/summary-panel.component';
import { UnsavedScenariosComponent } from './unsaved-scenarios/unsaved-scenarios.component';
import { PlanUnavailableComponent } from './plan-unavailable/plan-unavailable.component';

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
  ],
  imports: [CommonModule, MaterialModule],
})
export class PlanModule {}
