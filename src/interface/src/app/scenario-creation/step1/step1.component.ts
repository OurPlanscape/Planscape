import { CommonModule, KeyValue, KeyValuePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TreatmentGoalsService } from '@services';
import { ScenarioCreation } from '@types';
import { filter, map, shareReplay, take } from 'rxjs';
import { SectionComponent, StepDirective } from '@styleguide';
import { STAND_OPTIONS, STAND_SIZE } from '@plan/plan-helpers';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FeaturesModule } from '@features/features.module';
import { getGroupedGoals } from '@scenario/scenario-helper';
import { NewScenarioState } from '../new-scenario.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MatMenuModule } from '@angular/material/menu';
import { MatRadioModule } from '@angular/material/radio';
import { PopoverComponent } from '@styleguide/popover/popover.component';

@UntilDestroy()
@Component({
  selector: 'app-step1',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatRadioModule,
    SectionComponent,
    MatFormFieldModule,
    MatSelectModule,
    KeyValuePipe,
    MatIconModule,
    FeaturesModule,
    PopoverComponent,
  ],
  providers: [{ provide: StepDirective, useExisting: Step1Component }],
  templateUrl: './step1.component.html',
  styleUrl: './step1.component.scss',
})
export class Step1Component
  extends StepDirective<ScenarioCreation>
  implements OnInit
{
  form = new FormGroup({
    stand_size: new FormControl<STAND_SIZE | undefined>(undefined, [
      Validators.required,
    ]),
    treatment_goal: new FormControl<number | undefined>(undefined, [
      Validators.required,
    ]),
  });

  readonly standSizeOptions = STAND_OPTIONS;

  planId = this.route.parent?.snapshot.data['planId'];

  categorizedStatewideGoals$ = this.treatmentGoalsService
    .getTreatmentGoals(this.planId)
    .pipe(
      map((goals) => {
        return getGroupedGoals(goals);
      }),
      shareReplay(1)
    );

  constructor(
    private treatmentGoalsService: TreatmentGoalsService,
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

        if (config.treatment_goal) {
          this.form.get('treatment_goal')?.setValue(config.treatment_goal);
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
