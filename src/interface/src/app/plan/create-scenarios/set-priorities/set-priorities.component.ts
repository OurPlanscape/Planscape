import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { take, tap } from 'rxjs';
import { filter } from 'rxjs/operators';
import { MapService } from './../../../services/map.service';
import {
  PriorityRow,
  TreatmentGoalConfig,
  TreatmentQuestionConfig,
} from '../../../types/scenario.types';

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
export class SetPrioritiesComponent implements OnInit, OnChanges {
  @Input() selectedTreatmentQuestion: TreatmentQuestionConfig | null = null;
  @Output() changeConditionEvent = new EventEmitter<string>();

  private _treatmentGoals: TreatmentGoalConfig[] | null = [];
  treatmentGoals$ = this.planStateService.treatmentGoalsConfig$.pipe(
    take(1),
    tap((s) => (this._treatmentGoals = s))
  );

  formGroup = this.fb.group({
    selectedQuestion: [this.selectedTreatmentQuestion, Validators.required],
  });

  datasource = new MatTableDataSource<PriorityRow>();

  constructor(
    private mapService: MapService,
    private fb: FormBuilder,
    private planStateService: PlanStateService
  ) {}

  createForm() {
    this.formGroup = this.fb.group({
      selectedQuestion: [this.selectedTreatmentQuestion, Validators.required],
    });
    return this.formGroup;
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

  ngOnChanges(changes: SimpleChanges) {
    if (this.selectedTreatmentQuestion && this._treatmentGoals) {
      // We are losing the object reference somewhere (probably on this.planStateService.treatmentGoalsConfig$)
      // so when we simply `setValue` with `this.selectedTreatmentQuestion`, the object is
      // not part of the provided treatmentGoalsConfig$.
      // The workaround is to look for it, however we should look into the underlying issue
      let selectedQuestion = findQuestionOnTreatmentGoalsConfig(
        this._treatmentGoals,
        this.selectedTreatmentQuestion
      );
      if (selectedQuestion) {
        this.formGroup.get('selectedQuestion')?.setValue(selectedQuestion);
      }
      this.formGroup.disable();
    }
  }
}
