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
import { distinctUntilChanged } from 'rxjs/operators';
import { FeatureService } from '../../features/feature.service';

@Component({
  selector: 'app-step3',
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
  providers: [{ provide: StepDirective, useExisting: Step3Component }],
  templateUrl: './step3.component.html',
  styleUrl: './step3.component.scss',
})
export class Step3Component
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

  constructor(
    private newScenarioState: NewScenarioState,
    private featureService: FeatureService
  ) {
    super();
  }

  getData() {
    return this.form.value;
  }

  ngOnInit(): void {
    this.form.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((form) => {
        if (this.featureService.isFeatureEnabled('DYNAMIC_SCENARIO_MAP')) {
          const constraints: NamedConstraint[] = [];
          if (form.max_slope != null) {
            constraints.push({
              name: 'maxSlope',
              operator: 'lte',
              value: form.max_slope,
            });
          }
          if (form.min_distance_from_road != null) {
            constraints.push({
              name: 'distanceToRoads',
              operator: 'lte',
              value: form.min_distance_from_road,
            });
          }
          this.newScenarioState.setNamedConstraints(constraints);
        }
      });
  }
}
