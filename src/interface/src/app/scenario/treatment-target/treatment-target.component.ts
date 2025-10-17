import { Component, OnInit } from '@angular/core';
import {
  CommonModule,
  CurrencyPipe,
  DecimalPipe,
  NgClass,
  NgIf,
} from '@angular/common';
import { SectionComponent } from '@styleguide';
import { ScenarioCreation } from '@types';
import { StepDirective } from '../../../styleguide/steps/step.component';
import { NgxMaskModule } from 'ngx-mask';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { DEFAULT_TX_COST_PER_ACRE } from '@shared';
import { map, take } from 'rxjs';
import { NewScenarioState } from '../new-scenario.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-treatment-target',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DecimalPipe,
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

  form!: FormGroup;

  treatable_area$ = this.newScenarioState.availableStands$.pipe(
    map((s) => s.summary.treatable_area)
  );

  maxAreaValue$ = this.treatable_area$;

  constructor(private newScenarioState: NewScenarioState) {
    super();
  }

  ngOnInit(): void {
    this.maxAreaValue$
      .pipe(untilDestroyed(this), take(1))
      .subscribe((maxAreaValue) => {
        this.maxAreaValue = maxAreaValue || 0;

        this.form = new FormGroup(
          {
            max_area: new FormControl<number | null>(null, [
              Validators.min(this.minMaxAreaValue),
              Validators.required,
            ]),
            max_project_count: new FormControl<number | null>(null, [
              Validators.min(1),
              Validators.required,
            ]),
            estimated_cost: new FormControl<number>(DEFAULT_TX_COST_PER_ACRE, [
              Validators.required,
              Validators.min(1),
            ]),
          },
          { validators: this.workingAreaValidator(this.maxAreaValue) }
        );
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
        return null;
      }

      if (projectAreaCount?.value * acresPerProjectArea.value > maxAreaValue) {
        return { invalidWorkingArea: true };
      }

      return null;
    };
  }

  getData() {
    return this.form.value;
  }
}
