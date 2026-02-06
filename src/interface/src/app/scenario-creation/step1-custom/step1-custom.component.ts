import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  OverviewStep,
  ProcessOverviewComponent,
} from '@scenario-creation/process-overview/process-overview.component';
import { StandSizeSelectorComponent } from '@scenario-creation/stand-size-selector/stand-size-selector.component';
import { StepDirective } from '@styleguide';
import { ScenarioCreation } from '@types';
import { CUSTOM_SCENARIO_OVERVIEW_STEPS } from '@scenario/scenario.constants';
import { STAND_SIZE } from '@plan/plan-helpers';

@Component({
  selector: 'app-step1-custom',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ProcessOverviewComponent,
    StandSizeSelectorComponent,
  ],
  templateUrl: './step1-custom.component.html',
  styleUrl: './step1-custom.component.scss',
  providers: [{ provide: StepDirective, useExisting: Step1CustomComponent }],
})
export class Step1CustomComponent extends StepDirective<ScenarioCreation> {
  steps: OverviewStep[] = CUSTOM_SCENARIO_OVERVIEW_STEPS;

  form = new FormGroup({
    stand_size: new FormControl<STAND_SIZE | null>(null, Validators.required),
  });

  getData() {
    return this.form.value;
  }
}
