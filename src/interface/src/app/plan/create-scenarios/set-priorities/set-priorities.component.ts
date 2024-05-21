import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { distinctUntilChanged, take, tap } from 'rxjs';
import { filter } from 'rxjs/operators';
import { MapService, PlanStateService } from '@services';
import {
  PriorityRow,
  TreatmentGoalConfig,
  TreatmentQuestionConfig,
  TreatmentQuestionConfigForScenario,
} from '@types';
import {
  conditionsConfigToPriorityData,
  findQuestionOnTreatmentGoalsConfig,
} from '../../plan-helpers';
import { GoalOverlayService } from '../goal-overlay/goal-overlay.service';

@Component({
  selector: 'app-set-priorities',
  templateUrl: './set-priorities.component.html',
  styleUrls: ['./set-priorities.component.scss'],
})
export class SetPrioritiesComponent implements OnInit {
  private _treatmentGoals: TreatmentGoalConfig[] | null = [];
  treatmentGoals$ = this.planStateService.treatmentGoalsConfig$.pipe(
    distinctUntilChanged(),
    tap((s) => {
      this._treatmentGoals = s;
      // if we got new treatment goals we'll need to find the item again and set it as selected
      // TODO fix or remove
      // const value = this.goalsForm.get('selectedQuestion')?.value;
      // if (value) {
      //   this.setFormData(value);
      // }
    })
  );

  goalsForm = this.fb.group({
    selectedQuestion: <TreatmentQuestionConfig>[null, Validators.required],
  });

  datasource = new MatTableDataSource<PriorityRow>();

  constructor(
    private mapService: MapService,
    private fb: FormBuilder,
    private planStateService: PlanStateService,
    private goalOverlayService: GoalOverlayService
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

  getFormData(): TreatmentQuestionConfigForScenario {
    const selectedQuestion = this.goalsForm.get('selectedQuestion');

    // TODO THIS HAS WAY MORE STUFF THAN WE NEED
    if (selectedQuestion?.valid && selectedQuestion.value) {
      const t = selectedQuestion.value;
      return {
        ...t,
        // @ts-ignore
        scenario_output_fields: t?.scenario_output_fields_paths['metrics'],
      };
    } else {
      return {};
    }
  }

  setFormData(question_id: number) {
    if (this._treatmentGoals) {
      // We are losing the object reference somewhere (probably on this.planStateService.treatmentGoalsConfig$)
      // so when we simply `setValue` with `this.selectedTreatmentQuestion`, the object is
      // not part of the provided treatmentGoalsConfig$.
      // The workaround is to look for it, however we should look into the underlying issue
      let selectedQuestion = findQuestionOnTreatmentGoalsConfig(
        this._treatmentGoals,
        question_id
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
}
