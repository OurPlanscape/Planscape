import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-constraints-panel',
  templateUrl: './constraints-panel.component.html',
  styleUrls: ['./constraints-panel.component.scss'],
})
export class ConstraintsPanelComponent {
  @Input() constraintsForm: FormGroup | undefined;
  @Input() excludedAreasOptions: Array<string> | undefined;
  standSizeOptions: Array<String> = ['Small', 'Medium', 'Large'];

  constructor() {}

  toggleMaxCost() {
    if (this.constraintsForm!.get('budgetForm.estimatedCost')!.value) {
      (this.constraintsForm!.get('budgetForm') as FormGroup).controls[
        'maxCost'
      ].enable();
    } else {
      (this.constraintsForm!.get('budgetForm') as FormGroup).controls[
        'maxCost'
      ].disable();
    }
  }
}
