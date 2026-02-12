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
import { SectionComponent, StepDirective } from '@styleguide';
import { NgxMaskModule } from 'ngx-mask';
import { Constraint, ScenarioDraftConfiguration } from '@types';
import { NewScenarioState } from '../new-scenario.state';
import { debounceTime, map, switchMap } from 'rxjs';
import { distinctUntilChanged, filter, take } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ForsysService } from '@services/forsys.service';

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
  extends StepDirective<ScenarioDraftConfiguration>
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

  constructor(
    private newScenarioState: NewScenarioState,
    private forsysService: ForsysService
  ) {
    super();
  }

  getData() {
    return this.form.value;
  }

  ngOnInit(): void {
    this.forsysService.forsysData$
      .pipe(
        take(1),
        switchMap((forsysData) =>
          this.form.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            map((data: any) => {
              if (this.form.valid) {
                const constraints: Constraint[] = [];
                if (!(data.max_slope === null || data.max_slope === '')) {
                  constraints.push({
                    datalayer: forsysData.thresholds.slope.id,
                    operator: 'lte',
                    value: data.max_slope,
                  });
                }
                if (
                  !(
                    data.min_distance_from_road === null ||
                    data.min_distance_from_road === ''
                  )
                ) {
                  constraints.push({
                    datalayer: forsysData.thresholds.distance_from_roads.id,
                    operator: 'lte',
                    value: data.min_distance_from_road,
                  });
                }
                this.newScenarioState.setConstraints(constraints);
              }
            })
          )
        )
      )
      .subscribe();

    // Reading the config from the initial scenario config...?
    this.newScenarioState.scenarioConfig$
      .pipe(
        untilDestroyed(this),
        filter((c) => !!c?.constraints),
        take(1),
        switchMap((config) =>
          this.forsysService.forsysData$.pipe(
            map((data) => {
              const slope = config.constraints?.find(
                (c) => c.datalayer === data.thresholds.slope.id
              );
              if (slope) {
                this.form.get('max_slope')?.setValue(slope.value);
              }

              const distance = config.constraints?.find(
                (c) => c.datalayer === data.thresholds.distance_from_roads.id
              );
              if (distance) {
                this.form
                  .get('min_distance_from_road')
                  ?.setValue(distance.value);
              }

              return config;
            })
          )
        )
      )
      .subscribe((config) => {});
  }
}
