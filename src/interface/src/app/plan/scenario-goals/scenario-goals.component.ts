import { Component } from '@angular/core';
import { ScenarioGoal, TreatmentQuestionConfig } from '@types';
import { FormBuilder, Validators } from '@angular/forms';
import { TreatmentGoalsService } from '@services';

@Component({
  selector: 'app-scenario-goals',

  templateUrl: './scenario-goals.component.html',
  styleUrl: './scenario-goals.component.scss',
})
export class ScenarioGoalsComponent {
  constructor(
    private fb: FormBuilder,
    private treatmentGoalsService: TreatmentGoalsService
  ) {}

  goals$ = this.treatmentGoalsService.getTreatmentGoals();

  goalsForm = this.fb.group({
    selectedQuestion: <TreatmentQuestionConfig>[null, Validators.required],
  });

  createForm() {
    this.goalsForm = this.fb.group({
      selectedQuestion: <TreatmentQuestionConfig>[null, Validators.required],
    });
    return this.goalsForm;
  }

  selectGoal(goal: ScenarioGoal) {}
}
