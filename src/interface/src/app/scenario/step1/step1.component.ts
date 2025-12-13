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
import { ScenarioCreation, ScenarioGoal } from '@types';
import { filter, map, shareReplay, take } from 'rxjs';
import { ScenarioState } from 'src/app/scenario/scenario.state';
import { GoalOverlayService } from 'src/app/plan/goal-overlay/goal-overlay.service';
import { SectionComponent } from '@styleguide';
import { STAND_OPTIONS, STAND_SIZE } from 'src/app/plan/plan-helpers';
import { StepDirective } from '../../../styleguide/steps/step.component';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FeaturesModule } from '../../features/features.module';
import { getGroupedGoals } from '../scenario-helper';
import { NewScenarioState } from '../new-scenario.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ButtonComponent } from '@styleguide';
import { MatMenuModule } from '@angular/material/menu';
import { FeatureService } from 'src/app/features/feature.service';
import { MatRadioModule } from '@angular/material/radio';


@UntilDestroy()
@Component({
  selector: 'app-step1',
  standalone: true,
  imports: [
    ButtonComponent,
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

  scenarioGoal$ = this.scenarioState.currentScenario$.pipe(
    map((s) => s.treatment_goal?.name || '')
  );

  constructor(
    private goalOverlayService: GoalOverlayService,
    private treatmentGoalsService: TreatmentGoalsService,
    private scenarioState: ScenarioState,
    private newScenarioState: NewScenarioState,
    private route: ActivatedRoute,
    private featureService: FeatureService
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

  selectStatewideGoal(goal: ScenarioGoal) {
    // TODO: note-when we incorporate SCENARIO_CONFIG_UI, also remove the goaloverlay component and service
    if (
      !this.featureService.isFeatureEnabled('SCENARIO_CONFIG_UI') &&
      this.form.get('treatment_goal')?.enabled
    ) {
      this.goalOverlayService.setStateWideGoal(goal);
    }
  }

  reverseAlpha(a: KeyValue<string, any>, b: KeyValue<string, any>): number {
    return b.key.localeCompare(a.key);
  }

  getData() {
    return this.form.value;
  }

  // TODO: remove when SCENARIO_CONFIG_UI is removed
  get configUiFlagIsOn() {
    return this.featureService.isFeatureEnabled('SCENARIO_CONFIG_UI');
  }
}
