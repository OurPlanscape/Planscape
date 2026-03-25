import { Component } from '@angular/core';
import { CommonModule, DecimalPipe, NgIf } from '@angular/common';
import { SectionComponent, StepDirective } from '@styleguide';
import { NgxMaskModule } from 'ngx-mask';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DEFAULT_TX_COST_PER_ACRE } from '@shared';
import { LoadingValueComponent } from '@scenario-creation/loading-value.component';
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  of,
  startWith,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { NewScenarioState } from '@scenario-creation/new-scenario.state';
import { UntilDestroy } from '@ngneat/until-destroy';
import { STAND_SIZES } from '@plan/plan-helpers';
import { ScenarioDraftConfiguration, SubUnitsDetail } from '@app/types';
import { ScenarioService } from '@app/services';
import { ActivatedRoute } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@UntilDestroy()
@Component({
  selector: 'app-planning-approach-treatment-target',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    MatDividerModule,
    MatInputModule,
    MatFormFieldModule,
    NgIf,
    NgxMaskModule,
    ReactiveFormsModule,
    SectionComponent,
    MatProgressSpinnerModule,
    LoadingValueComponent,
  ],
  providers: [
    {
      provide: StepDirective,
      useExisting: PlanningApproachTreatmentTargetComponent,
    },
  ],
  templateUrl: './planning-approach-treatment-target.component.html',
  styleUrl: './planning-approach-treatment-target.component.scss',
})
export class PlanningApproachTreatmentTargetComponent extends StepDirective<ScenarioDraftConfiguration> {
  minAcreage: number = 0;
  form!: FormGroup;
  subUnitDetails: SubUnitsDetail | null = null;
  scenarioId = this.route.snapshot.data['scenarioId'];

  private subUnitsLayer$ = this.newScenarioState.scenarioConfig$.pipe(
    map((config) => config.sub_units_layer),
    filter((sub_units_layer): sub_units_layer is number => !!sub_units_layer),
    distinctUntilChanged()
  );

  subUnitDetails$ = this.subUnitsLayer$.pipe(
    switchMap((sub_units_layer) =>
      this.scenarioService.getSubUnitsDetails(this.scenarioId, {
        sub_units_layer,
      })
    ),
    // keep local copy for validations
    tap((subUnitDetails) => {
      this.subUnitDetails = subUnitDetails;
    })
  );

  getTotalTreated$!: Observable<number | null>;
  isCalculatingTotal = false;

  constructor(
    private newScenarioState: NewScenarioState,
    private scenarioService: ScenarioService,
    private route: ActivatedRoute
  ) {
    super();
  }

  override beforeStepLoad(): void {
    if (!this.form) {
      this.form = new FormGroup(
        {
          estimated_cost: new FormControl<number>(DEFAULT_TX_COST_PER_ACRE, [
            Validators.required,
            Validators.min(1),
          ]),
          // sub_units_target_value: false = Percentage / true = Number of acres
          sub_units_fixed_target: new FormControl<boolean>(true, [
            Validators.required,
          ]),
          // Percentage (when sub_units_fixed_target is false) or number of acres (when sub_units_fixed_target is true)
          sub_units_target_value: new FormControl<number | null>(null, [
            Validators.required,
          ]),
        },
        {
          validators: [this.workingAreaValidator()],
        }
      );

      this.getTotalTreated$ = combineLatest([
        this.subUnitsLayer$,
        this.form.valueChanges.pipe(startWith(this.form.value)),
        this.form.statusChanges.pipe(startWith(this.form.status)),
      ]).pipe(
        switchMap(([sub_units_layer, formValue, status]) => {
          if (status !== 'VALID') {
            this.isCalculatingTotal = false;
            return of(null);
          }
          this.isCalculatingTotal = true;
          return this.scenarioService
            .getSubUnitsDetails(this.scenarioId, {
              sub_units_layer,
              sub_units_fixed_target: formValue.sub_units_fixed_target,
              sub_units_target_value: formValue.sub_units_target_value,
            })
            .pipe(
              map((subUnitDetails) => subUnitDetails.targeted_area || null),
              tap(() => (this.isCalculatingTotal = false))
            );
        })
      );
    }

    this.newScenarioState.scenarioConfig$
      .pipe(
        take(1),
        filter((c) => !!c.targets)
      )
      .subscribe((config) => {
        this.minAcreage = config.stand_size
          ? STAND_SIZES[config.stand_size]
          : 0;
        if (config.targets && config.targets.estimated_cost) {
          this.form
            .get('estimated_cost')
            ?.setValue(config.targets.estimated_cost);
        }
        if (config.targets?.sub_units_fixed_target) {
          this.form
            .get('sub_units_fixed_target')
            ?.setValue(config.targets.sub_units_fixed_target);
        }
        if (config.targets?.sub_units_target_value) {
          this.form
            .get('sub_units_target_value')
            ?.setValue(config.targets.sub_units_target_value);
        }
      });
  }

  private workingAreaValidator(): ValidatorFn {
    return (form): ValidationErrors | null => {
      const sub_units_fixed_target = form.get('sub_units_fixed_target');
      const sub_units_target_value = form.get('sub_units_target_value');

      // If sub_units_fixed_target is TRUE we should validate number of acres
      // min number of acres is the stand size.
      if (sub_units_fixed_target?.value === true) {
        if (sub_units_target_value?.value < this.minAcreage) {
          return { invalidAcres: true };
        }
        if (
          this.subUnitDetails?.max &&
          sub_units_target_value?.value > this.subUnitDetails?.max
        ) {
          return { invalidAcres: true };
        }
      }
      // If sub_units_fixed_target is FALSE we should validate percentage
      if (sub_units_fixed_target?.value === false) {
        if (
          sub_units_target_value?.value < 0 ||
          sub_units_target_value?.value > 100
        ) {
          return { invalidPercentage: true };
        }
      }

      return null;
    };
  }

  getData() {
    return this.form.value;
  }

  getUnit(): string {
    return this.form.getRawValue().sub_units_fixed_target ? '#' : '%';
  }

  setUnitValue(unit: boolean) {
    this.form.get('sub_units_fixed_target')?.setValue(unit);
  }
}
