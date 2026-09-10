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
import {
  Constraint,
  CONSTRAINT_OPERATOR,
  CONSTRAINT_OPERATOR_MAP,
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

  form = new FormGroup(
    {
      constraintOperator: new FormControl<CONSTRAINT_OPERATOR | null>(this.data.operator ?? 'eq', {
        nonNullable: false,
      }),
      constraintValueOne: new FormControl<number | null>(this.data.valueOne ?? null, [
        Validators.required,
      ]),
      constraintValueTwo: new FormControl<number | null>(this.data.valueTwo ?? null),
    },
    { validators: [betweenValidator] }
  );

  get showSecondValue(): boolean {
    return this.form.get('constraintOperator')?.value === 'btw';
  }
  get isButtonDisabled(): boolean {
    return this.form.invalid;
  }

  ngOnInit() {
    if (this.data.mode === 'EDIT') {
      console.log('we are in edit mode!');
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

  private getOperatorDisplayText(operator: CONSTRAINT_OPERATOR): string {
    const def = CONSTRAINT_OPERATOR_MAP.get(operator);
    return def ? def.symbol : operator;
  }

  handleApply() {
    if (this.form.valid) {
      const formVal = this.form.value;
      const operator = formVal.constraintOperator ?? 'eq';
      const constraintSelection: NamedConstraint = {
        name: `${this.data.dataLayer.name}: ${this.getOperatorDisplayText(operator)} ${formVal.constraintValueOne}`,
        datalayer: this.data.dataLayer.id,
        operator,
        value: formVal.constraintValueOne ?? 0,
      };
      // if we have a 'btw' (Between) operator, we set different data
      if (
        operator === 'btw' &&
        formVal.constraintValueTwo !== null &&
        formVal.constraintValueTwo !== undefined
      ) {
        (constraintSelection.name = `${this.data.dataLayer.name}: ${formVal.constraintValueOne}-${formVal.constraintValueTwo}`),
          (constraintSelection.value2 = formVal.constraintValueTwo);
      }
      this.dialogRef.close({ action: 'SAVE', payload: constraintSelection });
    }
  }

  handleRemove() {
    console.log('we want to delete', this.data.dataLayer);
      this.dialogRef.close({ action: 'DELETE', payload: this.data.dataLayer });
  }

  cancel() {
    this.dialogRef.close();
  }
}
