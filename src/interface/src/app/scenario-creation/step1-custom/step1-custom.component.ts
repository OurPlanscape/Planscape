import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import {
  OverviewStep,
  ProcessOverviewComponent,
} from '@scenario-creation/process-overview/process-overview.component';
import { StandSizeSelectorComponent } from '@scenario-creation/stand-size-selector/stand-size-selector.component';
import { StepDirective } from '@styleguide';
import { ScenarioCreation } from '@types';
import { CUSTOM_SCENARIO_OVERVIEW_STEPS } from '@scenario/scenario.constants';

@Component({
  selector: 'app-step1-custom',
  standalone: true,
  imports: [ProcessOverviewComponent, StandSizeSelectorComponent],
  templateUrl: './step1-custom.component.html',
  styleUrl: './step1-custom.component.scss',
  providers: [{ provide: StepDirective, useExisting: Step1CustomComponent }],
})
export class Step1CustomComponent
  extends StepDirective<ScenarioCreation>
  implements AfterViewInit
{
  @ViewChild(StandSizeSelectorComponent)
  standSizeSelector!: StandSizeSelectorComponent;

  steps: OverviewStep[] = CUSTOM_SCENARIO_OVERVIEW_STEPS;

  form: FormGroup = new FormGroup({});

  ngAfterViewInit(): void {
    if (this.standSizeSelector) {
      this.form = new FormGroup({
        stand_size: this.standSizeSelector.control,
      });
    }
  }

  getData() {
    return {
      stand_size: this.standSizeSelector.control.value,
    };
  }
}
