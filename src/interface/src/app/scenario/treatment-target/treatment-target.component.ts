import { Component, OnInit } from '@angular/core';
import {
  CommonModule,
  CurrencyPipe,
  DecimalPipe,
  NgClass,
  NgIf,
} from '@angular/common';
import { SectionComponent, StepDirective } from '@styleguide';
import { ScenarioCreation } from '@types';
import { NgxMaskModule } from 'ngx-mask';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { DEFAULT_TX_COST_PER_ACRE } from '@shared';
import { filter, map, take } from 'rxjs';
import { NewScenarioState } from '../new-scenario.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { STAND_SIZES } from 'src/app/plan/plan-helpers';

@UntilDestroy()
@Component({
  selector: 'app-treatment-target',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DecimalPipe,
    MatDividerModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    NgClass,
    NgIf,
    NgxMaskModule,
    ReactiveFormsModule,
    SectionComponent,
  ],
  providers: [
    { provide: StepDirective, useExisting: TreatmentTargetComponent },
  ],
  templateUrl: './treatment-target.component.html',
  styleUrl: './treatment-target.component.scss',
})
export class TreatmentTargetComponent
  extends StepDirective<ScenarioCreation>
  implements OnInit
{
  maxAreaValue: number = 1;
  minMaxAreaValue = 1;
  maxProjectValue = 1;
  form!: FormGroup;

  summary$ = this.newScenarioState.availableStands$.pipe(map((s) => s.summary));

  minAcreage: number = 0;

  constructor(private newScenarioState: NewScenarioState) {
    super();
  }

  ngOnInit(): void {
    this.summary$.pipe(untilDestroyed(this)).subscribe((summary) => {
      this.maxAreaValue = summary.treatable_area || 0;
      this.maxProjectValue = summary.treatable_stand_count;
      this.form = new FormGroup(
        {
          max_area: new FormControl<number | null>(null, [
            this.minAreaValidator(),
            Validators.max(this.maxAreaValue),
            Validators.required,
          ]),
          max_project_count: new FormControl<number | null>(null, [
            Validators.min(1),
            Validators.max(this.maxProjectValue),
            Validators.required,
          ]),
          estimated_cost: new FormControl<number>(DEFAULT_TX_COST_PER_ACRE, [
            Validators.required,
            Validators.min(1),
          ]),
        },
        {
          validators: [this.workingAreaValidator(this.maxAreaValue)],
        }
      );

      this.newScenarioState.scenarioConfig$
        .pipe(
          untilDestroyed(this),
          take(1),
          filter((c) => !!c.targets)
        )
        .subscribe((config) => {
          this.minAcreage = config.stand_size
            ? STAND_SIZES[config.stand_size]
            : 0;
          if (config.targets) {
            if (config.targets.estimated_cost) {
              this.form
                .get('estimated_cost')
                ?.setValue(config.targets.estimated_cost);
            }
            if (config.targets.max_area) {
              this.form.get('max_area')?.setValue(config.targets.max_area);
            }
            if (config.targets.max_project_count) {
              this.form
                .get('max_project_count')
                ?.setValue(config.targets.max_project_count);
            }
          }
        });
    });
  }

  // Pre-condition: we should have a valid max_area (per project area) and max_project_count
  getTreatedPercentage(): number {
    const formValues = this.form.value;
    if (!this.maxAreaValue || this.maxAreaValue === 0) {
      return 0;
    }
    // Calculating the percentage based on the max_area ( acres per project area ) and the  max_project_count
    return (
      (formValues.max_area * formValues.max_project_count * 100) /
      this.maxAreaValue
    );
  }

  getTotalTreated(): number {
    const formValues = this.form.value;
    if (!this.maxAreaValue || this.maxAreaValue === 0) {
      return 0;
    }
    // Calculating the percentage based on the max_area ( acres per project area ) and the  max_project_count
    return formValues.max_area * formValues.max_project_count;
  }

  private minAreaValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const acresPerProjectArea = control;
      if (!acresPerProjectArea?.value) {
        return null;
      }
      if (acresPerProjectArea?.value < this.minAcreage) {
        return { invalidMinAcres: true };
      }
      return null;
    };
  }

  private workingAreaValidator(maxAreaValue: number): ValidatorFn {
    return (form): ValidationErrors | null => {
      const projectAreaCount = form.get('max_project_count');
      const acresPerProjectArea = form.get('max_area');

      // If we don't have project area count or max area return null since we have required validator
      if (
        !projectAreaCount?.value ||
        !acresPerProjectArea?.value ||
        !maxAreaValue
      ) {
        this.removeError(projectAreaCount, 'invalidWorkingArea');
        this.removeError(acresPerProjectArea, 'invalidWorkingArea');
        return null;
      }

      if (projectAreaCount?.value * acresPerProjectArea.value > maxAreaValue) {
        acresPerProjectArea?.markAsTouched();
        acresPerProjectArea?.setErrors({
          ...acresPerProjectArea.errors,
          invalidWorkingArea: true,
        });

        projectAreaCount?.markAsTouched();
        projectAreaCount?.setErrors({
          ...projectAreaCount.errors,
          invalidWorkingArea: true,
        });
        return { invalidWorkingArea: true };
      } else {
        this.removeError(projectAreaCount, 'invalidWorkingArea');
        this.removeError(acresPerProjectArea, 'invalidWorkingArea');
      }
      return null;
    };
  }

  private removeError(
    control: AbstractControl<any, any> | null,
    errorKey: string
  ): void {
    if (!control?.hasError(errorKey)) return;
    const { [errorKey]: removed, ...rest } = control.errors!;
    control.setErrors(Object.keys(rest).length ? rest : null);
  }

  getData() {
    return this.form.value;
  }
}
