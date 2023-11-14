import { Component } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { STAND_SIZES } from '../../plan-helpers';
import area from '@turf/area';
import { EXCLUDED_AREA_OPTIONS } from '../../../shared/constants';

@Component({
  selector: 'app-constraints-panel',
  templateUrl: './constraints-panel.component.html',
  styleUrls: ['./constraints-panel.component.scss'],
})
export class ConstraintsPanelComponent {
  constraintsForm: FormGroup = this.fb.group({});
  readonly excludedAreasOptions = EXCLUDED_AREA_OPTIONS;
  standSizeOptions = STAND_SIZES;

  constructor(private fb: FormBuilder) {}

  createForm() {
    let excludedAreasChosen: { [key: string]: (boolean | Validators)[] } = {};
    EXCLUDED_AREA_OPTIONS.forEach((area: string) => {
      excludedAreasChosen[area] = [false, Validators.required];
    });
    this.constraintsForm = this.fb.group(
      {
        budgetForm: this.fb.group({
          // Estimated cost in $ per acre
          estimatedCost: [2470, Validators.min(0)],
          // Max cost of treatment for entire planning area
          // Initially disabled, estimatedCost is required as input before maxCost is enabled
          maxCost: ['', Validators.min(0.01)],
        }),
        physicalConstraintForm: this.fb.group({
          // TODO Update if needed once we have confirmation if this is the correct default %
          // Maximum slope allowed for planning area
          maxSlope: [, [Validators.min(0), Validators.max(100)]],
          // Minimum distance from road allowed for planning area
          minDistanceFromRoad: [, [Validators.min(0)]],
          // Maximum area to be treated in acres
          // Using 500 as minimum for now. Ideally the minimum should be based on stand size.
          maxArea: ['', [Validators.min(500)]],
          // Stand Size selection
          standSize: ['LARGE', Validators.required],
        }),
        excludedAreasForm: this.fb.group(excludedAreasChosen),
        excludeAreasByDegrees: [true],
        excludeAreasByDistance: [true],
      },
      { validators: this.constraintsFormValidator }
    );
    return this.constraintsForm;
  }

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

  private constraintsFormValidator(
    constraintsForm: AbstractControl
  ): ValidationErrors | null {
    // Only one of budget or treatment area constraints is required.
    const maxCost = constraintsForm.get('budgetForm.maxCost');
    const maxArea = constraintsForm.get('physicalConstraintForm.maxArea');
    const valid = !!maxCost?.value || !!maxArea?.value;
    return valid ? null : { budgetOrAreaRequired: true };
  }
}
