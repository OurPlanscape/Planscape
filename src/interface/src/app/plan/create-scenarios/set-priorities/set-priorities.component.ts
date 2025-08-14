import { Component, Input } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { map, shareReplay } from 'rxjs';
import { TreatmentGoalsService } from '@services';

import { ScenarioConfig, ScenarioGoal, TreatmentQuestionConfig } from '@types';

import { GoalOverlayService } from '../goal-overlay/goal-overlay.service';
import { ScenarioState } from '../../../scenario/scenario.state';
import { KeyValue } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FeatureService } from 'src/app/features/feature.service';
import {
  getGroupedGoals,
  legacyGetCategorizedGoals,
} from 'src/app/scenario/scenario-helper';

@Component({
  selector: 'app-set-priorities',
  templateUrl: './set-priorities.component.html',
  styleUrls: ['./set-priorities.component.scss'],
})
export class SetPrioritiesComponent {
  @Input() scenarioStatus = '';

  goalsForm = this.fb.group({
    selectedQuestion: <TreatmentQuestionConfig>[null, Validators.required],
  });

  planId = this.route.snapshot.data['planId'];

  treatmentGoals$ = this.treatmentGoalsService.getTreatmentGoals(
    this.featuresService.isFeatureEnabled('CONUS_WIDE_SCENARIOS')
      ? this.planId
      : null
  );

  groupedStatewideGoals$ = this.treatmentGoals$.pipe(
    map((goals) => {
      return getGroupedGoals(goals);
    }),
    shareReplay(1)
  );

  // TODO: remove this entire observable once CONUS_WIDE_SCENARIOS is removed
  categorizedStatewideGoals$ = this.treatmentGoals$.pipe(
    map((goals) => legacyGetCategorizedGoals(goals)),
    shareReplay(1)
  );

  scenarioGoal$ = this.scenarioState.currentScenario$.pipe(
    map((s) => s.treatment_goal?.name || '')
  );

  constructor(
    private fb: FormBuilder,
    private goalOverlayService: GoalOverlayService,
    private treatmentGoalsService: TreatmentGoalsService,
    private scenarioState: ScenarioState,
    private route: ActivatedRoute,
    private featuresService: FeatureService
  ) {}

  createForm() {
    this.goalsForm = this.fb.group({
      selectedQuestion: <TreatmentQuestionConfig>[null, Validators.required],
    });
    return this.goalsForm;
  }

  getFormData(): Pick<ScenarioConfig, 'treatment_question'> {
    const selectedQuestion = this.goalsForm.get('selectedQuestion');
    if (selectedQuestion?.valid) {
      return { treatment_question: selectedQuestion.value };
    } else {
      return {};
    }
  }

  selectStatewideGoal(goal: ScenarioGoal) {
    if (this.goalsForm.enabled) {
      this.goalOverlayService.setStateWideGoal(goal);
    }
  }

  get isNewScenario() {
    return this.scenarioStatus === 'NOT_STARTED';
  }

  reverseAlpha(a: KeyValue<string, any>, b: KeyValue<string, any>): number {
    return b.key.localeCompare(a.key);
  }
}
