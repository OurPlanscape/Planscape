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
import { CONSTRAINT_OPERATOR } from '@app/types';
import {
  InputDirective,
  InputFieldComponent,
  ModalComponent,
  ModalInfoComponent,
} from '@styleguide';

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

  dataLayerName = this.data?.dataLayerName;

  form = new FormGroup(
    {
      constraintOperator: new FormControl<CONSTRAINT_OPERATOR | null>('eq', {
        nonNullable: false,
      }),
      constraintValueOne: new FormControl<number | null>(null, [
        Validators.required,
      ]),
      constraintValueTwo: new FormControl<number | null>(null),
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

  handleApply() {
    if (this.form.valid) {
      const formVal = this.form.value;
      const operator = formVal.constraintOperator ?? 'eq';
      const constraintSelection: any = {
        operator,
        value: formVal.constraintValueOne ?? 0,
      };
      if (
        operator === 'btw' &&
        formVal.constraintValueTwo !== null &&
        formVal.constraintValueTwo !== undefined
      ) {
        constraintSelection.value2 = formVal.constraintValueTwo;
      }
      this.dialogRef.close(constraintSelection);
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
