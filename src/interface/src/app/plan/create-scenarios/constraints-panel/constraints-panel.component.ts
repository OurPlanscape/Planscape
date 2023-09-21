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

  togglMaxAreaAndMaxCost() {
    console.log('in toggle')
    console.log(this.constraintsForm!.get('budgetForm.maxCost')!.value);
    console.log(this.constraintsForm!.get('physicalConstraintForm.maxArea')!.value);
    if (this.constraintsForm!.get('budgetForm.maxCost')!.value) {
    
      (this.constraintsForm!.get('physicalConstraintForm') as FormGroup).controls[
        'maxArea'
      ].disable();
    } else {
      (this.constraintsForm!.get('physicalConstraintForm') as FormGroup).controls[
        'maxArea'
      ].enable();
    }
    if (this.constraintsForm!.get('physicalConstraintForm.maxArea')!.value) {
      (this.constraintsForm!.get('budgetForm') as FormGroup).controls[
        'maxCost'
      ].disable();
    } else {
      (this.constraintsForm!.get('budgetForm') as FormGroup).controls[
        'maxCost'
      ].enable();
    }
  }
}
