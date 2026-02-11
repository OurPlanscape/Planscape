import { Component, OnInit } from '@angular/core';
import {
  OverviewStep,
  ProcessOverviewComponent,
} from '@scenario-creation/process-overview/process-overview.component';
import { SectionComponent, StepDirective } from '@styleguide';
import { ScenarioDraftConfiguration } from '@types';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CUSTOM_SCENARIO_OVERVIEW_STEPS } from '@scenario/scenario.constants';
import { KeyValue, KeyValuePipe, NgForOf, NgIf } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { filter, take } from 'rxjs';
import { STAND_OPTIONS, STAND_SIZE } from '@plan/plan-helpers';
import { NewScenarioState } from '../new-scenario.state';
import { ActivatedRoute } from '@angular/router';

@UntilDestroy()
@Component({
  selector: 'app-step1-custom',
  standalone: true,
  imports: [
    ProcessOverviewComponent,
    KeyValuePipe,
    MatFormFieldModule,
    MatIconModule,
    MatOptionModule,
    MatSelectModule,
    NgForOf,
    NgIf,
    ReactiveFormsModule,
    SectionComponent,
  ],
  templateUrl: './step1-custom.component.html',
  styleUrl: './step1-custom.component.scss',
  // required to "import" current step1
  providers: [{ provide: StepDirective, useExisting: Step1CustomComponent }],
})
export class Step1CustomComponent
  extends StepDirective<ScenarioDraftConfiguration>
  implements OnInit
{
  readonly standSizeOptions = STAND_OPTIONS;
  readonly planId = this.route.parent?.snapshot.data['planId'];

  steps: OverviewStep[] = CUSTOM_SCENARIO_OVERVIEW_STEPS;

  form = new FormGroup({
    stand_size: new FormControl<STAND_SIZE | undefined>(undefined, [
      Validators.required,
    ]),
  });

  constructor(
    private newScenarioState: NewScenarioState,
    private route: ActivatedRoute
  ) {
    super();
  }

  ngOnInit(): void {
    // Reading the config from the scenario state
    this.newScenarioState.scenarioConfig$
      .pipe(
        untilDestroyed(this),
        filter((c) => !!c?.stand_size || !!c?.treatment_goal),
        take(1)
      )
      .subscribe((config) => {
        if (config.stand_size) {
          this.form.get('stand_size')?.setValue(config.stand_size);
        }
      });
  }

  reverseAlpha(a: KeyValue<string, any>, b: KeyValue<string, any>): number {
    return b.key.localeCompare(a.key);
  }

  getData() {
    return this.form.value;
  }

  get selectedStandSize() {
    const key = this.form.get('stand_size')?.value as STAND_SIZE | null;
    return key ? this.standSizeOptions[key] : null;
  }
}
