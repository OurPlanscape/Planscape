import {
  AsyncPipe,
  KeyValue,
  KeyValuePipe,
  NgFor,
  NgIf,
} from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  BehaviorSubject,
  combineLatest,
  filter,
  map,
  Observable,
  shareReplay,
  startWith,
  take,
} from 'rxjs';
import {
  BannerComponent,
  ExpanderSectionComponent,
  NoResultsComponent,
  SearchBarComponent,
  SectionComponent,
} from '@styleguide';
import { ChipSelectorComponent } from '@styleguide/chip-selector/chip-selector.component';
import { ExpanderItemComponent } from '@styleguide/expander-item/expander-item.component';
import { TreatmentGoalsService } from '@services';
import { getGroupedGoals } from '@scenario/scenario-helper';
import { ScenarioGoal } from '@types';
import { NewScenarioState } from '../new-scenario.state';

interface GoalResults {
  categories: Record<string, ScenarioGoal[]>;
  hasResults: boolean;
  searchTerm: string;
}

@UntilDestroy()
@Component({
  selector: 'app-improved-treatment-goal-selector',
  standalone: true,
  imports: [
    AsyncPipe,
    BannerComponent,
    ChipSelectorComponent,
    ExpanderItemComponent,
    ExpanderSectionComponent,
    KeyValuePipe,
    MatProgressSpinnerModule,
    NgFor,
    NgIf,
    NoResultsComponent,
    SearchBarComponent,
    SectionComponent,
  ],
  templateUrl: './improved-treatment-goal-selector.component.html',
  styleUrl: './improved-treatment-goal-selector.component.scss',
})
export class ImprovedTreatmentGoalSelectorComponent implements OnInit {
  @Input() control!: FormControl<number | null>;

  private planId = this.route.parent?.snapshot.data['planId'];

  mappableGoal = true;

  private searchTerm$ = new BehaviorSubject<string>('');

  availableTreatmentGoals$ = this.treatmentGoalsService
    .getTreatmentGoals(this.planId)
    .pipe(shareReplay(1));

  results$: Observable<GoalResults> = combineLatest([
    this.availableTreatmentGoals$,
    this.searchTerm$,
  ]).pipe(
    map(([goals, searchTerm]) => {
      const term = searchTerm.trim();
      const needle = term.toLowerCase();
      const matches = needle
        ? goals.filter((goal) => goal.name.toLowerCase().includes(needle))
        : goals;

      return {
        categories: getGroupedGoals(matches),
        hasResults: matches.length > 0,
        searchTerm: term,
      };
    })
  );

  selectedGoals$!: Observable<ScenarioGoal[]>;

  counter$!: Observable<string>;

  constructor(
    private treatmentGoalsService: TreatmentGoalsService,
    private newScenarioState: NewScenarioState,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const selectedGoal$ = combineLatest([
      this.availableTreatmentGoals$,
      this.control.valueChanges.pipe(startWith(this.control.value)),
    ]).pipe(
      map(([goals, id]) => goals.find((goal) => goal.id === id) ?? null),
      shareReplay(1)
    );

    this.selectedGoals$ = selectedGoal$.pipe(
      map((goal) => (goal ? [goal] : []))
    );

    this.counter$ = selectedGoal$.pipe(
      map((goal) => `${goal ? 1 : 0}/1 Selected`)
    );

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

  selectGoal(goalId: string | number) {
    this.control.setValue(Number(goalId));
    this.control.markAsTouched();
  }

  clearGoal() {
    this.control.setValue(null);
    this.control.markAsTouched();
  }

  search(term: string) {
    this.searchTerm$.next(term);
  }

  trackByCategory(_: number, entry: KeyValue<string, ScenarioGoal[]>) {
    return entry.key;
  }

  trackByGoal(_: number, goal: ScenarioGoal) {
    return goal.id;
  }

  reverseAlpha(a: KeyValue<string, any>, b: KeyValue<string, any>): number {
    return b.key.localeCompare(a.key);
  }
}
