import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { distinctUntilChanged, map, take, tap } from 'rxjs';
import { filter } from 'rxjs/operators';
import {
  LegacyPlanStateService,
  MapService,
  TreatmentGoalsService,
} from '@services';
import {
  PriorityRow,
  ScenarioConfig,
  ScenarioGoal,
  TreatmentGoalConfig,
  TreatmentQuestionConfig,
} from '@types';
import {
  conditionsConfigToPriorityData,
  findQuestionOnTreatmentGoalsConfig,
} from '../../plan-helpers';
import { GoalOverlayService } from '../goal-overlay/goal-overlay.service';
import { FeatureService } from '../../../features/feature.service';
import { ScenarioState } from '../../../maplibre-map/scenario.state';

@Component({
  selector: 'app-set-priorities',
  templateUrl: './set-priorities.component.html',
  styleUrls: ['./set-priorities.component.scss'],
})
export class SetPrioritiesComponent implements OnInit {
  @Input() scenarioStatus = '';
  private _treatmentGoals: TreatmentGoalConfig[] | null = [];
  treatmentGoals$ = this.LegacyPlanStateService.treatmentGoalsConfig$.pipe(
    distinctUntilChanged(),
    tap((s) => {
      this._treatmentGoals = s;
      // if we got new treatment goals we'll need to find the item again and set it as selected
      const value = this.goalsForm.get('selectedQuestion')?.value;

      if (value) {
        this.setFormData(value);
      }
    })
  );

  goalsForm = this.fb.group({
    selectedQuestion: <TreatmentQuestionConfig>[null, Validators.required],
  });

  datasource = new MatTableDataSource<PriorityRow>();

  goals$ = this.treatmentGoalsService.getTreatmentGoals();

  scenarioGoal$ = this.scenarioState.currentScenario$.pipe(
    map((s) => s.treatment_goal?.name || '')
  );

  constructor(
    private mapService: MapService,
    private fb: FormBuilder,
    private LegacyPlanStateService: LegacyPlanStateService,
    private goalOverlayService: GoalOverlayService,
    private featureService: FeatureService,
    private treatmentGoalsService: TreatmentGoalsService,
    private scenarioState: ScenarioState
  ) {}

  createForm() {
    this.goalsForm = this.fb.group({
      selectedQuestion: <TreatmentQuestionConfig>[null, Validators.required],
    });
    return this.goalsForm;
  }

  ngOnInit(): void {
    this.mapService.conditionsConfig$
      .pipe(
        filter((result) => !!result),
        take(1)
      )
      .subscribe((conditionsConfig) => {
        this.datasource.data = conditionsConfigToPriorityData(
          conditionsConfig!
        );
      });
  }

  getFormData(): Pick<ScenarioConfig, 'treatment_question'> {
    const selectedQuestion = this.goalsForm.get('selectedQuestion');
    if (selectedQuestion?.valid) {
      return { treatment_question: selectedQuestion.value };
    } else {
      return {};
    }
  }

  setFormData(question: TreatmentQuestionConfig) {
    if (this._treatmentGoals) {
      // We are losing the object reference somewhere (probably on this.LegacyPlanStateService.treatmentGoalsConfig$)
      // so when we simply `setValue` with `this.selectedTreatmentQuestion`, the object is
      // not part of the provided treatmentGoalsConfig$.
      // The workaround is to look for it, however we should look into the underlying issue
      let selectedQuestion = findQuestionOnTreatmentGoalsConfig(
        this._treatmentGoals,
        question
      );
      if (selectedQuestion) {
        this.goalsForm.get('selectedQuestion')?.setValue(selectedQuestion);
      }
      this.goalsForm.disable();
    }
  }

  selectGoal(goal: TreatmentQuestionConfig) {
    if (this.goalsForm.enabled) {
      this.goalOverlayService.setQuestion(goal);
    }
  }

  selectStatewideGoal(goal: ScenarioGoal) {
    if (this.goalsForm.enabled) {
      this.goalOverlayService.setStateWideGoal(goal);
    }
  }

  get isStatewideScenariosEnabled() {
    return this.featureService.isFeatureEnabled('statewide_scenarios');
  }

  get isNewScenario() {
    return this.scenarioStatus != 'NOT_STARTED';
  }
}
