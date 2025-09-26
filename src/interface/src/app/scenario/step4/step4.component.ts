import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  CommonModule,
  NgClass,
  CurrencyPipe,
  DecimalPipe,
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

@Component({
  selector: 'app-step4',
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
  providers: [{ provide: StepDirective, useExisting: Step4Component }],
  templateUrl: './step4.component.html',
  styleUrl: './step4.component.scss',
})
export class Step4Component
  extends StepDirective<ScenarioCreation>
  implements OnChanges
{
  @Input() maxAreaValue: number = 0;

  form = new FormGroup(
    {
      max_area: new FormControl<number | null>(null, [
        Validators.min(this.minMaxAreaValue),
        Validators.max(this.maxAreaValue),
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

  constructor() {
    super();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // update the form when the maxAreaValue  is updated
    if (changes['maxAreaValue'] && this.form) {
      const maxArea = this.form.get('max_area') as FormControl;
      maxArea?.clearValidators();
      maxArea?.addValidators([
        Validators.min(this.minMaxAreaValue),
        Validators.max(this.maxAreaValue),
        Validators.required,
      ]);
      this.form.clearValidators();
      this.form.addValidators([this.workingAreaValidator(this.maxAreaValue)]);
      // refresh form
      this.form.updateValueAndValidity();
    }
  }

  get minMaxAreaValue() {
    return 1;
  }

  // Pre-condition: we should have a valid max_area (per project area) and and max_project_count
  getTreatedPercentage(): number {
    const formValues = this.form.value;
    // Calculating the percentage based on the max_area ( acres per project area ) and the  max_project_count
    return (
      (formValues.max_area! * formValues.max_project_count! * 100) /
      this.maxAreaValue!
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
        debugger;
        return { invalidWorkingArea: true };
      }

      return null;
    };
  }

  getData() {
    return this.form.value;
  }
}
