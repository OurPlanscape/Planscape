import { Component } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { STAND_SIZES } from '../../plan-helpers';
import { EXCLUDED_AREAS } from '../../../shared/constants';
import { ScenarioConfig } from '../../../types';

@Component({
  selector: 'app-constraints-panel',
  templateUrl: './constraints-panel.component.html',
  styleUrls: ['./constraints-panel.component.scss'],
})
export class ConstraintsPanelComponent {
  constraintsForm: FormGroup = this.createForm();
  readonly excludedAreasOptions = EXCLUDED_AREAS;
  readonly standSizeOptions = STAND_SIZES;

  constructor(private fb: FormBuilder) {}

  createForm() {
    let excludedAreasChosen: { [key: string]: (boolean | Validators)[] } = {};
    EXCLUDED_AREAS.forEach((area) => {
      excludedAreasChosen[area.key] = [false, Validators.required];
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
          minDistanceFromRoad: [, [Validators.min(0), Validators.max(100000)]],
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
    return this.constraintsForm?.get('physicalConstraintForm.maxArea');
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

  getFormData(): Partial<ScenarioConfig> {
    let scenarioConfig: ScenarioConfig = {};

    const estimatedCost = this.constraintsForm.get('budgetForm.estimatedCost');
    const maxCost = this.constraintsForm.get('budgetForm.maxCost');
    const maxArea = this.constraintsForm.get('physicalConstraintForm.maxArea');
    const minDistanceFromRoad = this.constraintsForm.get(
      'physicalConstraintForm.minDistanceFromRoad'
    );
    const maxSlope = this.constraintsForm.get(
      'physicalConstraintForm.maxSlope'
    );

    scenarioConfig.stand_size = this.constraintsForm.get(
      'physicalConstraintForm.standSize'
    )?.value;
    scenarioConfig.excluded_areas = [];
    EXCLUDED_AREAS.forEach((area) => {
      if (
        this.constraintsForm.get('excludedAreasForm.' + area.key)?.valid &&
        this.constraintsForm.get('excludedAreasForm.' + area.key)?.value
      ) {
        scenarioConfig.excluded_areas?.push(area.key);
      }
    });
    if (estimatedCost?.valid)
      scenarioConfig.est_cost = parseFloat(estimatedCost.value);
    if (maxCost?.valid) scenarioConfig.max_budget = parseFloat(maxCost.value);
    if (maxArea?.valid) {
      scenarioConfig.max_treatment_area_ratio = parseFloat(maxArea.value);
    }
    if (minDistanceFromRoad?.valid) {
      scenarioConfig.min_distance_from_road = parseFloat(
        minDistanceFromRoad.value
      );
    }
    if (maxSlope?.valid) scenarioConfig.max_slope = parseFloat(maxSlope.value);

    return scenarioConfig;
  }

  setFormData(config: ScenarioConfig) {
    EXCLUDED_AREAS.forEach((area) => {
      if (
        config.excluded_areas &&
        config.excluded_areas.indexOf(area.key) > -1
      ) {
        this.constraintsForm
          .get('excludedAreasForm.' + area.key)
          ?.setValue(true);
      } else {
        this.constraintsForm
          .get('excludedAreasForm.' + area.key)
          ?.setValue(false);
      }
    });

    if (config.est_cost) {
      this.constraintsForm
        .get('budgetForm.estimatedCost')
        ?.setValue(config.est_cost);
    }
    if (config.max_budget) {
      this.constraintsForm
        .get('budgetForm.maxCost')
        ?.setValue(config.max_budget);
    }
    if (config.max_treatment_area_ratio) {
      this.constraintsForm
        .get('physicalConstraintForm.maxArea')
        ?.setValue(config.max_treatment_area_ratio);
    }
    if (config.min_distance_from_road) {
      this.constraintsForm
        .get('physicalConstraintForm.minDistanceFromRoad')
        ?.setValue(config.min_distance_from_road);
    }
    if (config.max_slope) {
      this.constraintsForm
        .get('physicalConstraintForm.maxSlope')
        ?.setValue(config.max_slope);
    }

    if (config.stand_size) {
      this.constraintsForm
        .get('physicalConstraintForm.standSize')
        ?.setValue(config.stand_size);
    }
  }

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
