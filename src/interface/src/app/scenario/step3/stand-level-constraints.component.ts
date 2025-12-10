import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SectionComponent } from '@styleguide';
import { NgxMaskModule } from 'ngx-mask';
import { StepDirective } from 'src/styleguide/steps/step.component';
import { NamedConstraint, ScenarioCreation } from '@types';
import { NewScenarioState } from '../new-scenario.state';
import { debounceTime } from 'rxjs';
import { distinctUntilChanged, filter, take } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-stand-level-constraints',
  standalone: true,
  imports: [
    CommonModule,
    SectionComponent,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    NgxMaskModule,
  ],
  providers: [
    { provide: StepDirective, useExisting: StandLevelConstraintsComponent },
  ],
  templateUrl: './stand-level-constraints.component.html',
  styleUrl: './stand-level-constraints.component.scss',
})
export class StandLevelConstraintsComponent
  extends StepDirective<ScenarioCreation>
  implements OnInit
{
  form = new FormGroup({
    max_slope: new FormControl<number | null>(null, [
      Validators.min(0),
      Validators.max(100),
    ]),
    min_distance_from_road: new FormControl<number | null>(null, [
      Validators.min(0),
      Validators.max(100000),
    ]),
  });

  constructor(private newScenarioState: NewScenarioState) {
    super();
  }

  getData() {
    return this.form.value;
  }

  ngOnInit(): void {
    this.form.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((form: any) => {
        if (this.form.valid) {
          const constraints: NamedConstraint[] = [];
          if (!(form.max_slope === null || form.max_slope === '')) {
            constraints.push({
              name: 'maxSlope',
              operator: 'lte',
              value: form.max_slope,
            });
          }
          if (
            !(
              form.min_distance_from_road === null ||
              form.min_distance_from_road === ''
            )
          ) {
            constraints.push({
              name: 'distanceToRoads',
              operator: 'lte',
              value: form.min_distance_from_road,
            });
          }
          this.newScenarioState.setNamedConstraints(constraints);
        }
      });

    // Reading the config from the scenario state
    this.newScenarioState.scenarioConfig$
      .pipe(
        untilDestroyed(this),
        filter((c) => !!c?.constraints),
        take(1)
      )
      .subscribe((config) => {
        if (config.constraints && config.constraints.length > 0) {
          const max_slope = this.newScenarioState
            .getNamedConstraints(config.constraints)
            .find((c) => c?.name === 'maxSlope');

          if (max_slope) {
            this.form.get('max_slope')?.setValue(max_slope.value);
          }

          const min_distance_from_road = this.newScenarioState
            .getNamedConstraints(config.constraints)
            .find((c) => c?.name === 'distanceToRoads');
          if (min_distance_from_road) {
            this.form
              .get('min_distance_from_road')
              ?.setValue(min_distance_from_road.value);
          }
        }
      });
  }
}
