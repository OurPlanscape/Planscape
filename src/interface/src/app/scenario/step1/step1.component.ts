import { CommonModule, KeyValue, KeyValuePipe } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatLegacyRadioModule } from '@angular/material/legacy-radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TreatmentGoalsService } from '@services';
import { ScenarioCreation, ScenarioGoal } from '@types';
import { map, shareReplay } from 'rxjs';
import { ScenarioState } from 'src/app/scenario/scenario.state';
import { GoalOverlayService } from 'src/app/plan/goal-overlay/goal-overlay.service';
import { SectionComponent } from '@styleguide';
import { STAND_OPTIONS, STAND_SIZE } from 'src/app/plan/plan-helpers';
import { StepDirective } from '../../../styleguide/steps/step.component';
import { ActivatedRoute } from '@angular/router';
import { FeatureService } from 'src/app/features/feature.service';
import { MatIconModule } from '@angular/material/icon';
import { FeaturesModule } from '../../features/features.module';
import { getGroupedGoals } from '../scenario-helper';

@Component({
  selector: 'app-step1',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatLegacyRadioModule,
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
export class Step1Component extends StepDirective<ScenarioCreation> {
  form = new FormGroup({
    stand_size: new FormControl<STAND_SIZE | undefined>(undefined, [
      Validators.required,
    ]),
    treatment_goal: new FormControl<number | undefined>(1, [
      Validators.required,
    ]),
  });

  readonly standSizeOptions = STAND_OPTIONS;

  planId = this.route.snapshot.data['planId'];

  categorizedStatewideGoals$ = this.treatmentGoalsService
    .getTreatmentGoals(
      this.featuresService.isFeatureEnabled('CONUS_WIDE_SCENARIOS')
        ? this.planId
        : null
    )
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
    private route: ActivatedRoute,
    private featuresService: FeatureService
  ) {
    super();
  }

  selectStatewideGoal(goal: ScenarioGoal) {
    if (this.form.get('treatment_goal')?.enabled) {
      this.goalOverlayService.setStateWideGoal(goal);
    }
  }

  reverseAlpha(a: KeyValue<string, any>, b: KeyValue<string, any>): number {
    return b.key.localeCompare(a.key);
  }

  getPostData() {
    return this.form.value;
  }

  getDraftData() {
    return {
      treatment_goal: this.form.value.treatment_goal,
      configuration: { stand_size: this.form.value.stand_size },
    };
  }

  getData() {
    if (this.featuresService.isFeatureEnabled('SCENARIO_DRAFTS')) {
      return this.getDraftData();
    } else {
      return this.getPostData();
    }
  }
}
