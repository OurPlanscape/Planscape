import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import {
  OverviewStep,
  ProcessOverviewComponent,
} from '@scenario-creation/process-overview/process-overview.component';
import { StandSizeSelectorComponent } from '@scenario-creation/stand-size-selector/stand-size-selector.component';
import { TreatmentGoalSelectorComponent } from '@scenario-creation/treatment-goal-selector/treatment-goal-selector.component';
import { StepDirective } from '@styleguide';
import { ScenarioCreation } from '@types';
import { SCENARIO_OVERVIEW_STEPS } from '@scenario/scenario.constants';

@Component({
  selector: 'app-step1-with-overview',
  standalone: true,
  imports: [
    ProcessOverviewComponent,
    StandSizeSelectorComponent,
    TreatmentGoalSelectorComponent,
  ],
  templateUrl: './step1-with-overview.component.html',
  styleUrl: './step1-with-overview.component.scss',
  providers: [
    { provide: StepDirective, useExisting: Step1WithOverviewComponent },
  ],
})
export class Step1WithOverviewComponent
  extends StepDirective<ScenarioCreation>
  implements AfterViewInit
{
  @ViewChild(StandSizeSelectorComponent)
  standSizeSelector!: StandSizeSelectorComponent;

  @ViewChild(TreatmentGoalSelectorComponent)
  treatmentGoalSelector!: TreatmentGoalSelectorComponent;

  steps: OverviewStep[] = SCENARIO_OVERVIEW_STEPS;

  // Form built from children's controls
  form: FormGroup = new FormGroup({});

  ngAfterViewInit(): void {
    // Build form from children's internal controls
    if (this.standSizeSelector && this.treatmentGoalSelector) {
      this.form = new FormGroup({
        stand_size: this.standSizeSelector.control,
        treatment_goal: this.treatmentGoalSelector.control,
      });
    }
  }

  getData() {
    return {
      stand_size: this.standSizeSelector.control.value,
      treatment_goal: this.treatmentGoalSelector.control.value,
    };
  }
}
