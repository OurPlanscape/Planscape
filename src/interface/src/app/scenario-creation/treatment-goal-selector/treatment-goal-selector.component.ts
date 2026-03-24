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
import { filter, map, shareReplay, take, tap } from 'rxjs';
import { BannerComponent } from '@styleguide';
import { ScenarioGoal } from '@app/types';

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

  mappableGoal = false;
  allGoals : ScenarioGoal[] = [];

  categorizedStatewideGoals$ = this.treatmentGoalsService
    .getTreatmentGoals(this.planId)
    .pipe(
      tap((goals) => this.allGoals = goals),
      map((goals) => getGroupedGoals(goals)),
      shareReplay(1)
    );

  constructor(
    private treatmentGoalsService: TreatmentGoalsService,
    private newScenarioState: NewScenarioState,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.newScenarioState.scenarioConfig$
      .pipe(
        untilDestroyed(this),
        filter((c) => !!c?.treatment_goal),
        take(1)
      )
      .subscribe((config) => {
        if (config.treatment_goal) {
          // if goal exists from config, but it doesnt match an existing goal, we consider it unmappable
          this.mappableGoal = this.allGoals.map((goal : ScenarioGoal) => goal.id).includes(config.treatment_goal);
          this.control.setValue(config.treatment_goal);
        }
      });
  }

  reverseAlpha(a: KeyValue<string, any>, b: KeyValue<string, any>): number {
    return b.key.localeCompare(a.key);
  }
}
