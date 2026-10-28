import { NgIf } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { getOperatorDisplayText } from '@app/scenario/scenario-helper';
import {
  Constraint,
  CONSTRAINT_OPERATOR,
  CONSTRAINT_OPERATORS,
} from '@app/types';
import {
  InputDirective,
  InputFieldComponent,
  ModalComponent,
  ModalInfoComponent,
} from '@styleguide';

export interface NamedConstraint extends Constraint {
  name: string;
}

export const betweenValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const operator = control.get('constraintOperator')?.value;
  if (operator !== 'btw') {
    return null;
  }

  const valOne = control.get('constraintValueOne')?.value;
  const valTwo = control.get('constraintValueTwo')?.value;
  const errors: ValidationErrors = {};

  if (valOne === null || valOne === undefined || valOne === '') {
    errors['requiredOne'] = true;
  }
  if (valTwo === null || valTwo === undefined || valTwo === '') {
    errors['requiredTwo'] = true;
  }

  return Object.keys(errors).length > 0 ? errors : null;
};

const DIGITS_AND_COMMAS = /^\s*\d+(?:\s*,\s*\d+)*\s*(?:,\s*)?$/; // allows '999', '9, 9999', '9999,9999,'
const LIST_OPERATORS = ['in', 'nin']; // operators that accept multi values

// This allows us to enter numbers and the separator/delimiter for multi valued fields
export const splitValueValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const operator = control.get('constraintOperator')?.value;
  const valueOne = control.get('constraintValueOne')?.value;
  if (valueOne === null || valueOne === undefined || valueOne === '') {
    return null; // required checks live in betweenValidator / required attr
  }

  if (!DIGITS_AND_COMMAS.test(valueOne)) {
    return { invalidNumberList: true };
  }

  if (valueOne.includes(',') && !LIST_OPERATORS.includes(operator)) {
    return { multipleNotAllowed: true };
  }
  return null;
};

@Component({
  selector: 'app-adv-stand-level-constraints-modal',
  standalone: true,
  imports: [
    InputDirective,
    InputFieldComponent,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ModalComponent,
    ModalInfoComponent,
    NgIf,
    ReactiveFormsModule,
  ],
  templateUrl: './adv-stand-level-constraints-modal.component.html',
  styleUrl: './adv-stand-level-constraints-modal.component.scss',
})
export class AdvStandLevelConstraintsModalComponent implements OnInit {
  readonly dialogRef = inject(
    MatDialogRef<AdvStandLevelConstraintsModalComponent>
  );
  readonly data = inject(MAT_DIALOG_DATA);
  public constraintOperators = CONSTRAINT_OPERATORS;
  editMode = false;
  dataLayerName = this.data?.dataLayerName;
  minValue = this.data?.dataLayer?.info?.stats[0]?.min;
  maxValue = this.data?.dataLayer?.info?.stats[0]?.max;

  minMaxSplitValidator: ValidatorFn = (
    control: AbstractControl
  ): ValidationErrors | null => {
    const raw = control.value;

    if (raw === null || raw === undefined || raw === '') {
      return null;
    }
    // check for whether we have bounds at all
    if (this.minValue === null || this.maxValue === null) {
      return null;
    }
    const outOfRange = String(raw)
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '')
      .some((s) => {
        const n = Number(s);
        return Number.isNaN(n) || n < this.minValue || n > this.maxValue;
      });

    return outOfRange ? { valueNotInRange: true } : null;
  };

  form = new FormGroup(
    {
      constraintOperator: new FormControl<CONSTRAINT_OPERATOR | null>(
        this.data.operator ?? 'in',
        {
          nonNullable: false,
        }
      ),
      constraintValueOne: new FormControl<string | null>(
        this.data.valueOne ?? null,
        [Validators.required, this.minMaxSplitValidator]
      ),
      constraintValueTwo: new FormControl<number | null>(
        this.data.valueTwo ?? null,
        this.minMaxSplitValidator
      ),
    },
    { validators: [betweenValidator, splitValueValidator] }
  );

  get showSecondValue(): boolean {
    return this.form.get('constraintOperator')?.value === 'btw';
  }
  get isButtonDisabled(): boolean {
    return this.form.invalid;
  }

  get valueOneLabel() {
    if (this.showSecondValue) {
      if (this.minValue && this.maxValue) {
        return `Min (${this.minValue})`;
      }
      return 'Min';
    } else if (this.minValue && this.maxValue) {
      return `Value (${this.minValue}-${this.maxValue})`;
    }
    return 'Value';
  }

  get valueTwoLabel() {
    if (this.minValue && this.maxValue) {
      return `Max (${this.maxValue})`;
    }
    return 'Max';
  }

  ngOnInit() {
    if (this.data.mode === 'EDIT') {
      this.editMode = true;
    }

    this.form.get('constraintOperator')?.valueChanges.subscribe((operator) => {
      const valTwoControl = this.form.get('constraintValueTwo');

      if (operator === 'btw') {
        valTwoControl?.enable();
      } else {
        valTwoControl?.disable();

        // clear it, so it doesn't get submitted
        valTwoControl?.setValue(null);
        valTwoControl?.markAsUntouched();
      }
    });
  }

  private readonly VALUE_ONE_ERROR_MESSAGES: Record<string, string> = {
    requiredOne: 'A value is required.',
    invalidNumberList: 'Enter numbers only, separated by commas.',
    multipleNotAllowed: 'This operator requires single values.',
    valueNotInRange: 'Values must be within the valid range.',
  };

  private readonly VALUE_TWO_ERROR_MESSAGES: Record<string, string> = {
    requiredTwo: 'Please enter a number.',
    valueNotInRange: 'Values must be within the valid range.',
  };

  private errorsFor(ctrlName: 'constraintValueOne' | 'constraintValueTwo') {
    return {
      ...(this.form.controls[ctrlName].errors ?? {}),
      ...(this.form.errors ?? {}),
    };
  }

  get valueOneHasErrors(): boolean {
    const ctrl = this.form.controls.constraintValueOne;
    const errors = this.errorsFor('constraintValueOne');
    const keys = Object.keys(errors).filter((k) => k !== 'requiredTwo');
    return ctrl.touched && keys.length > 0;
  }

  get valueOneErrorMsg(): string {
    const errors = this.errorsFor('constraintValueOne');
    if (typeof errors['conflict'] === 'string') return errors['conflict'];
    const key = Object.keys(errors).find(
      (k) => this.VALUE_ONE_ERROR_MESSAGES[k]
    );
    return key ? this.VALUE_ONE_ERROR_MESSAGES[key] : '';
  }

  get valueTwoHasErrors(): boolean {
    const ctrl = this.form.controls.constraintValueTwo;
    const errors = this.errorsFor('constraintValueTwo');
    const keys = Object.keys(errors).filter((k) => k !== 'requiredOne');
    return ctrl.touched && keys.length > 0;
  }
  get valueTwoErrorMsg(): string {
    const errors = this.errorsFor('constraintValueTwo');
    if (typeof errors['conflict'] === 'string') return errors['conflict'];
    const key = Object.keys(errors).find(
      (k) => this.VALUE_TWO_ERROR_MESSAGES[k]
    );
    return key ? this.VALUE_TWO_ERROR_MESSAGES[key] : '';
  }

  handleApply() {
    if (this.form.valid) {
      const formVal = this.form.value;
      const operator = formVal.constraintOperator ?? 'in';

      const constraintSelection: NamedConstraint = {
        name: `${this.data.dataLayer.name}: ${getOperatorDisplayText(operator)} ${formVal.constraintValueOne}`,
        datalayer: this.data.dataLayer.id,
        operator,
        value: `${formVal.constraintValueOne ?? 0}`,
      };

      // if we have a 'btw' (Between) operator, we set different data
      if (
        operator === 'btw' &&
        formVal.constraintValueTwo !== null &&
        formVal.constraintValueTwo !== undefined
      ) {
        (constraintSelection.name = `${this.data.dataLayer.name}: ${formVal.constraintValueOne}-${formVal.constraintValueTwo}`),
          (constraintSelection.value = `${formVal.constraintValueOne},${formVal.constraintValueTwo}`);
      }
      this.dialogRef.close({ action: 'SAVE', payload: constraintSelection });
    }
  }

  get isMultiOperator() {
    return (
      this.form.value.constraintOperator === 'in' ||
      this.form.value.constraintOperator === 'nin'
    );
  }

  handleRemove() {
    this.dialogRef.close({ action: 'DELETE', payload: this.data.dataLayer });
  }

  cancel() {
    this.dialogRef.close();
  }
}
