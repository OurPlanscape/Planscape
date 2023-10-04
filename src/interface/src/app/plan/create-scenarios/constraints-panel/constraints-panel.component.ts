import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { STAND_SIZES } from '../../plan-helpers';
import area from '@turf/area';

@Component({
  selector: 'app-constraints-panel',
  templateUrl: './constraints-panel.component.html',
  styleUrls: ['./constraints-panel.component.scss'],
})
export class ConstraintsPanelComponent {
  @Input() constraintsForm: FormGroup | undefined;
  @Input() excludedAreasOptions: Array<string> | undefined;
  standSizeOptions = STAND_SIZES;

  constructor() {}

  get maxArea() {
    const area = this.constraintsForm?.get('physicalConstraintForm.maxArea');
    return area;
  }

  togglMaxAreaAndMaxCost() {
    if (this.constraintsForm!.get('budgetForm.maxCost')!.value) {
      (
        this.constraintsForm!.get('physicalConstraintForm') as FormGroup
      ).controls['maxArea'].disable();
    } else {
      (
        this.constraintsForm!.get('physicalConstraintForm') as FormGroup
      ).controls['maxArea'].enable();
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

  protected readonly area = area;
}
