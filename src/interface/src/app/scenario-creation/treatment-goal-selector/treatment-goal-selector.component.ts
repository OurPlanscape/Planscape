import { Component, OnInit } from '@angular/core';
import { CommonModule, KeyValue, KeyValuePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { ActivatedRoute } from '@angular/router';
import { FormFragment, formFragmentProviders, SectionComponent } from '@styleguide';
import { PopoverComponent } from '@styleguide/popover/popover.component';
import { TreatmentGoalsService } from '@services';
import { getGroupedGoals } from '@scenario/scenario-helper';
import { NewScenarioState } from '../new-scenario.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { filter, map, shareReplay, take } from 'rxjs';

@UntilDestroy()
@Component({
  selector: 'app-treatment-goal-selector',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    KeyValuePipe,
    SectionComponent,
    PopoverComponent,
  ],
  providers: formFragmentProviders(TreatmentGoalSelectorComponent),
  templateUrl: './treatment-goal-selector.component.html',
  styleUrl: './treatment-goal-selector.component.scss',
})
export class TreatmentGoalSelectorComponent
  extends FormFragment<number | undefined>
  implements OnInit
{
  control = new FormControl<number | undefined>(undefined, {
    validators: [Validators.required],
    nonNullable: true,
  });

  private planId = this.route.parent?.snapshot.data['planId'];

  categorizedStatewideGoals$ = this.treatmentGoalsService
    .getTreatmentGoals(this.planId)
    .pipe(
      map((goals) => getGroupedGoals(goals)),
      shareReplay(1)
    );

  constructor(
    private treatmentGoalsService: TreatmentGoalsService,
    private newScenarioState: NewScenarioState,
    private route: ActivatedRoute
  ) {
    super();
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.newScenarioState.scenarioConfig$
      .pipe(
        untilDestroyed(this),
        filter((c) => !!c?.treatment_goal),
        take(1)
      )
      .subscribe((config) => {
        if (config.treatment_goal) {
          this.control.setValue(config.treatment_goal);
        }
      });
  }

  reverseAlpha(a: KeyValue<string, any>, b: KeyValue<string, any>): number {
    return b.key.localeCompare(a.key);
  }
}
