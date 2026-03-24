import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, KeyValue, KeyValuePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { ActivatedRoute } from '@angular/router';
import { SectionComponent } from '@styleguide';
import { PopoverComponent } from '@styleguide/popover/popover.component';
import { TreatmentGoalsService } from '@services';
import { getGroupedGoals } from '@scenario/scenario-helper';
import { NewScenarioState } from '../new-scenario.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { combineLatest, filter, map, shareReplay, take } from 'rxjs';
import { BannerComponent } from '@styleguide';

@UntilDestroy()
@Component({
  selector: 'app-treatment-goal-selector',
  standalone: true,
  imports: [
    BannerComponent,
    CommonModule,
    ReactiveFormsModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    KeyValuePipe,
    SectionComponent,
    PopoverComponent,
  ],
  templateUrl: './treatment-goal-selector.component.html',
  styleUrl: './treatment-goal-selector.component.scss',
})
export class TreatmentGoalSelectorComponent implements OnInit {
  @Input() control!: FormControl<number | null>;

  private planId = this.route.parent?.snapshot.data['planId'];

  mappableGoal = true;

  availableTreatmentGoals$ = this.treatmentGoalsService
    .getTreatmentGoals(this.planId)
    .pipe(shareReplay(1));

  categorizedStatewideGoals$ = this.availableTreatmentGoals$.pipe(
    map((goals) => getGroupedGoals(goals))
  );

  constructor(
    private treatmentGoalsService: TreatmentGoalsService,
    private newScenarioState: NewScenarioState,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.availableTreatmentGoals$,
      this.newScenarioState.scenarioConfig$.pipe(
        map((c) => c?.treatment_goal),
        filter((goalId) => !!goalId)
      ),
    ])
      .pipe(take(1), untilDestroyed(this))
      .subscribe(([goals, selectedId]) => {
        this.mappableGoal = goals.some((g) => g.id === selectedId);
        if (selectedId) {
          this.control.setValue(selectedId);
        }
      });
  }

  reverseAlpha(a: KeyValue<string, any>, b: KeyValue<string, any>): number {
    return b.key.localeCompare(a.key);
  }
}
