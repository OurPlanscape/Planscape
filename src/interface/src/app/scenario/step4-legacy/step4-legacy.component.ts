import { Component, Input, SimpleChanges, OnChanges } from '@angular/core';
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
  AbstractControl,
  FormControl,
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
  NgForm,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  calculateMaxArea,
  calculateMinArea,
  calculateMinBudget,
  hasEnoughBudget,
} from '../../validators/scenarios';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { DEFAULT_TX_COST_PER_ACRE } from '@shared';
import { FeatureService } from 'src/app/features/feature.service';

const customErrors: Record<'notEnoughBudget' | 'budgetOrAreaRequired', string> =
  {
    notEnoughBudget: 'notEnoughBudget',
    budgetOrAreaRequired: 'budgetOrAreaRequired',
  };

/**
 * This component is deprecated. Use Step4Component instead
 * @deprecated
 */
@Component({
  selector: 'app-step4-legacy',
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
  providers: [{ provide: StepDirective, useExisting: Step4LegacyComponent }],
  templateUrl: './step4-legacy.component.html',
  styleUrl: './step4-legacy.component.scss',
})
export class Step4LegacyComponent
  extends StepDirective<ScenarioCreation>
  implements OnChanges
{
  @Input() maxAreaValue: number = 0;

  form = new FormGroup(
    {
      max_area: new FormControl<number | null>(null, [
        Validators.min(this.minMaxAreaValue),
        Validators.max(this.maxMaxAreaValue),
      ]),
      max_budget: new FormControl<number | null>(null, [Validators.min(0)]),
      estimated_cost: new FormControl<number>(DEFAULT_TX_COST_PER_ACRE, [
        Validators.required,
      ]),
    },
    { validators: this.budgetOrAreaRequiredValidator }
  );

  constructor(private featureService: FeatureService) {
    super();
  }

  focusedSelection = ''; // string to identify which selection is focused
  budgetStateMatcher = new NotEnoughBudgetStateMatcher();

  get minBudgetValue(): number {
    const estCostPerAcre =
      this.form.get('estimated_cost')?.value ?? DEFAULT_TX_COST_PER_ACRE;
    return calculateMinBudget(this.maxAreaValue, estCostPerAcre);
  }

  get minMaxAreaValue() {
    return calculateMinArea(this.maxAreaValue);
  }

  get maxMaxAreaValue() {
    return this.featureService.isFeatureEnabled('DYNAMIC_SCENARIO_MAP')
      ? this.maxAreaValue
      : calculateMaxArea(this.maxAreaValue);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // update the form when the maxAreaValue  is updated
    if (changes['maxAreaValue'] && this.form) {
      const maxArea = this.form.get('max_area') as FormControl;
      maxArea?.clearValidators();
      maxArea?.addValidators([
        Validators.min(this.minMaxAreaValue),
        Validators.max(this.maxMaxAreaValue),
      ]);
      // also update the totalBudgetValidator
      this.form.clearValidators();
      this.form.addValidators([
        this.budgetOrAreaRequiredValidator,
        this.totalBudgetedValidator(this.maxAreaValue),
      ]);

      // refresh form
      this.form.updateValueAndValidity();
    }
  }

  /**
   * checks that one of budget or treatment area constraints is provided.
   * @param form
   * @private
   */
  private budgetOrAreaRequiredValidator(
    form: AbstractControl
  ): ValidationErrors | null {
    const maxBudget = form.get('max_budget');
    const maxArea = form.get('max_area');
    const valid = !!maxBudget?.value || !!maxArea?.value;
    return valid ? null : { [customErrors.budgetOrAreaRequired]: true };
  }

  /**
   * Checks that the maxBudget is enough for the selected estimatedCost per acre
   * @param maxAreaValue
   * @private
   */
  private totalBudgetedValidator(maxAreaValue: number): ValidatorFn {
    return (form): ValidationErrors | null => {
      const maxBudget = form.get('max_budget')?.value;
      const estCostPerAcre =
        form.get('estimated_cost')?.value ?? DEFAULT_TX_COST_PER_ACRE;

      if (!!maxBudget) {
        const hasBudget = hasEnoughBudget(
          maxAreaValue,
          estCostPerAcre,
          maxBudget
        );

        return hasBudget
          ? null
          : {
              [customErrors.notEnoughBudget]: calculateMinBudget(
                maxAreaValue,
                estCostPerAcre
              ),
            };
      }
      return null;
    };
  }

  getData() {
    return this.form.value;
  }

  // This enables and disables fields, based on what our current selection is
  toggleMaxAreaAndMaxBudget() {
    const maxBudgetControl = this.form!.get('max_budget');
    const maxAreaControl = this.form!.get('max_area');

    if (maxBudgetControl?.value) {
      maxAreaControl?.disable();
    } else {
      maxAreaControl?.enable();
    }

    if (maxAreaControl?.value) {
      maxBudgetControl?.disable();
    } else {
      maxBudgetControl?.enable();
    }
  }
}

class NotEnoughBudgetStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: FormControl | null,
    form: FormGroupDirective | NgForm | null
  ): boolean {
    const hasError = form?.hasError(customErrors.notEnoughBudget);
    return !!(control && control.touched && (control.invalid || hasError));
  }
}
