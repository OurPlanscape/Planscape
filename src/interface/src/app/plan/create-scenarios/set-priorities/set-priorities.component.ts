import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { take, tap } from 'rxjs';
import { filter } from 'rxjs/operators';
import { MapService } from '../../../services';
import {
  PriorityRow,
  ScenarioConfig,
  TreatmentGoalConfig,
  TreatmentQuestionConfig,
} from '../../../types';

import { PlanStateService } from '../../../services/plan-state.service';
import {
  conditionsConfigToPriorityData,
  findQuestionOnTreatmentGoalsConfig,
} from '../../plan-helpers';

@Component({
  selector: 'app-set-priorities',
  templateUrl: './set-priorities.component.html',
  styleUrls: ['./set-priorities.component.scss'],
})
export class SetPrioritiesComponent implements OnInit {
  @Output() changeConditionEvent = new EventEmitter<string>();

  private _treatmentGoals: TreatmentGoalConfig[] | null = [];
  treatmentGoals$ = this.planStateService.treatmentGoalsConfig$.pipe(
    take(1),
    tap((s) => (this._treatmentGoals = s))
  );

  goalsForm = this.fb.group({
    selectedQuestion: <TreatmentQuestionConfig>[null, Validators.required],
  });

  datasource = new MatTableDataSource<PriorityRow>();

  constructor(
    private mapService: MapService,
    private fb: FormBuilder,
    private planStateService: PlanStateService
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
      // We are losing the object reference somewhere (probably on this.planStateService.treatmentGoalsConfig$)
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
}
