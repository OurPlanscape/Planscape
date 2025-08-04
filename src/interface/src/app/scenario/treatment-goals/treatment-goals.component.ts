import { CommonModule, KeyValue } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatLegacyRadioModule } from '@angular/material/legacy-radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TreatmentGoalsService } from '@services';
import {
  CategorizedScenarioGoals,
  ScenarioGoal,
  TreatmentQuestionConfig,
} from '@types';
import { map, shareReplay } from 'rxjs';
import { ScenarioState } from 'src/app/scenario/scenario.state';
import { GoalOverlayService } from 'src/app/plan/create-scenarios/goal-overlay/goal-overlay.service';
import { SectionComponent } from '@styleguide';

@Component({
  selector: 'app-treatment-goals',
  standalone: true,
  imports: [
    CommonModule,
    SectionComponent,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatLegacyRadioModule,
  ],
  templateUrl: './treatment-goals.component.html',
  styleUrl: './treatment-goals.component.scss',
})
export class TreatmentGoalsComponent {
  form: FormGroup = new FormGroup({
    selectedQuestion: new FormControl<TreatmentQuestionConfig | null>(null, [
      Validators.required,
    ]),
  });

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
    private goalOverlayService: GoalOverlayService,
    private treatmentGoalsService: TreatmentGoalsService,
    private scenarioState: ScenarioState
  ) {}

  selectStatewideGoal(goal: ScenarioGoal) {
    if (this.form.get('selectedQuestion')?.enabled) {
      this.goalOverlayService.setStateWideGoal(goal);
    }
  }

  reverseAlpha(a: KeyValue<string, any>, b: KeyValue<string, any>): number {
    return b.key.localeCompare(a.key);
  }
}
