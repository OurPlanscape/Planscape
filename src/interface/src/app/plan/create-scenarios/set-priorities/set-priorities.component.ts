import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { map, shareReplay, take } from 'rxjs';
import { filter } from 'rxjs/operators';
import { MapService, TreatmentGoalsService } from '@services';
import {
  CategorizedScenarioGoals,
  PriorityRow,
  ScenarioConfig,
  ScenarioGoal,
  TreatmentQuestionConfig,
} from '@types';
import { conditionsConfigToPriorityData } from '../../plan-helpers';
import { GoalOverlayService } from '../goal-overlay/goal-overlay.service';
import { ScenarioState } from '../../../maplibre-map/scenario.state';
import { KeyValue } from '@angular/common';

@Component({
  selector: 'app-set-priorities',
  templateUrl: './set-priorities.component.html',
  styleUrls: ['./set-priorities.component.scss'],
})
export class SetPrioritiesComponent implements OnInit {
  @Input() scenarioStatus = '';

  goalsForm = this.fb.group({
    selectedQuestion: <TreatmentQuestionConfig>[null, Validators.required],
  });

  datasource = new MatTableDataSource<PriorityRow>();

  categorizedStatewideGoals$ = this.treatmentGoalsService
    .getTreatmentGoals()
    .pipe(
      map((goals) =>
        goals.reduce<CategorizedScenarioGoals>((acc, goal) => {
          const category = goal.category_text;
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(goal);
          return acc;
        }, {})
      ),
      shareReplay(1)
    );

  scenarioGoal$ = this.scenarioState.currentScenario$.pipe(
    map((s) => s.treatment_goal?.name || '')
  );

  constructor(
    private mapService: MapService,
    private fb: FormBuilder,
    private goalOverlayService: GoalOverlayService,
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

  selectStatewideGoal(goal: ScenarioGoal) {
    if (this.goalsForm.enabled) {
      this.goalOverlayService.setStateWideGoal(goal);
    }
  }

  get isNewScenario() {
    return this.scenarioStatus != 'NOT_STARTED';
  }

  reverseAlpha(a: KeyValue<string, any>, b: KeyValue<string, any>): number {
    return b.key.localeCompare(a.key);
  }
}
