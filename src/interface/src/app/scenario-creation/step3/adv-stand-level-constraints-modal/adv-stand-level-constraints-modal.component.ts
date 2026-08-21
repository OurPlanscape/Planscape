import { Component, inject } from '@angular/core';
import { ModalComponent, ModalInfoComponent } from '@styleguide';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { NgIf } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-adv-stand-level-constraints-modal',
  standalone: true,
  imports: [
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
export class AdvStandLevelConstraintsModalComponent {
  readonly dialogRef = inject(
    MatDialogRef<AdvStandLevelConstraintsModalComponent>
  );

  //TODO: this is a mock
  dataLayerName = 'My Data Layer';

  showSecondValue = false;

  operatorSelection: string = 'eq';

  savingConstraint = true;

  form = new FormGroup({
    constraintOperator: new FormControl<string | null>(null, [
      Validators.min(0),
      Validators.max(100),
    ]),
    constraintValueOne: new FormControl<number | null>(null, [
      Validators.min(0),
      Validators.max(100000),
    ]),
    constraintValueTwo: new FormControl<number | null>(null, [
      Validators.min(0),
      Validators.max(100000),
    ]),
  });

  handleApply() {
    if (this.form.valid && !this.savingConstraint) {
      this.savingConstraint = true;
      console.log('saving...');
    }
  }

  handleOperatorChange(operator: any) {
    if (operator === 'btw') {
      this.showSecondValue = true;
    } else {
      this.showSecondValue = false;
    }
  }

  cancel() {
    this.dialogRef.close;
  }
}
