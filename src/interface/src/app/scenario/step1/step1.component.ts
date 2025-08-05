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
import {
  CategorizedScenarioGoals,
  ControlsOf,
  ScenarioCreation,
  ScenarioGoal,
} from '@types';
import { map, shareReplay } from 'rxjs';
import { ScenarioState } from 'src/app/scenario/scenario.state';
import { GoalOverlayService } from 'src/app/plan/create-scenarios/goal-overlay/goal-overlay.service';
import { SectionComponent } from '@styleguide';
import { STAND_OPTIONS, STAND_SIZE } from 'src/app/plan/plan-helpers';

@Component({
  selector: 'app-step1',
  standalone: true,
  imports: [
    CommonModule,
    SectionComponent,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatLegacyRadioModule,
    SectionComponent,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
    KeyValuePipe,
  ],
  templateUrl: './step1.component.html',
  styleUrl: './step1.component.scss',
})
export class Step1Component {
  form = new FormGroup<ControlsOf<Partial<ScenarioCreation>>>({
    configuration: new FormGroup({
      stand_size: new FormControl<STAND_SIZE | null>(null, [
        Validators.required,
      ]),
    }),
    treatment_goal: new FormControl(null, [Validators.required]),
  });

  readonly standSizeOptions = STAND_OPTIONS;

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
    if (this.form.get('treatment_goal')?.enabled) {
      this.goalOverlayService.setStateWideGoal(goal);
    }
  }

  reverseAlpha(a: KeyValue<string, any>, b: KeyValue<string, any>): number {
    return b.key.localeCompare(a.key);
  }
}
