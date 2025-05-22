import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  FormGroupDirective,
  NgForm,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { STAND_SIZES } from '../../plan-helpers';
import { ScenarioConfig } from '@types';
import { ErrorStateMatcher } from '@angular/material/core';
import {
  calculateMaxArea,
  calculateMinArea,
  calculateMinBudget,
  hasEnoughBudget,
} from '../../../validators/scenarios';
import { ScenarioState } from 'src/app/maplibre-map/scenario.state';
import { firstValueFrom, tap } from 'rxjs';
import { FeatureService } from 'src/app/features/feature.service';

const customErrors: Record<'notEnoughBudget' | 'budgetOrAreaRequired', string> =
  {
    notEnoughBudget: 'notEnoughBudget',
    budgetOrAreaRequired: 'budgetOrAreaRequired',
  };

@Component({
  selector: 'app-constraints-panel',
  templateUrl: './constraints-panel.component.html',
  styleUrls: ['./constraints-panel.component.scss'],
})
export class ConstraintsPanelComponent implements OnChanges {
  constraintsForm!: FormGroup;
  readonly standSizeOptions = Object.keys(STAND_SIZES);

  @Input() showWarning = false;
  @Input() planningAreaAcres = 0;

  budgetStateMatcher = new NotEnoughBudgetStateMatcher();

  focusedSelection = ''; // string to identify which selection is focused

  excludedAreas$ = this.scenarioState.excludedAreas$.pipe(
    tap((areas) => (this.excludedAreas = areas))
  );
  excludedAreas: { key: number; label: string; id: number }[] = [];

  constructor(
    private fb: FormBuilder,
    private scenarioState: ScenarioState,
    private featureService: FeatureService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    // update the form when the planningAreaAcres is updated
    if (changes['planningAreaAcres'] && this.constraintsForm) {
      const maxArea = this.maxArea as FormControl;
      maxArea.clearValidators();
      maxArea.addValidators([
        Validators.min(this.minMaxAreaValue),
        Validators.max(this.maxMaxAreaValue),
      ]);
      // also update the totalBudgetValidator
      this.constraintsForm.clearValidators();
      this.constraintsForm.addValidators([
        this.budgetOrAreaRequiredValidator,
        this.totalBudgetedValidator(this.planningAreaAcres),
      ]);

      this.constraintsForm
        .get('physicalConstraintForm.standSize')
        ?.setValue(this.defaultStandSize());
      // refresh form
      this.constraintsForm.updateValueAndValidity();
    }
  }

  defaultStandSize() {
    if (this.standSizeDisabled('MEDIUM')) {
      return 'SMALL';
    }
    if (this.standSizeDisabled('LARGE')) {
      return 'MEDIUM';
    }
    return 'LARGE';
  }

  async loadExcludedAreas() {
    const excludedAreas = await firstValueFrom(this.excludedAreas$);
    this.excludedAreas = excludedAreas;
    this.constraintsForm = await this.createForm();
    return excludedAreas;
  }

  async createForm() {
    let excludedAreasChosen: { [key: string]: (boolean | Validators)[] } = {};
    this.excludedAreas.forEach((area) => {
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
          maxArea: [
            '',
            [
              Validators.min(this.minMaxAreaValue),
              Validators.max(this.maxMaxAreaValue),
            ],
          ],
          // Stand Size selection
          standSize: ['LARGE', Validators.required],
        }),
        excludedAreasForm: this.fb.group(excludedAreasChosen),
        excludeAreasByDegrees: [true],
        excludeAreasByDistance: [true],
        planningAreaAcres: [this.planningAreaAcres],
      },
      {
        validators: [
          this.budgetOrAreaRequiredValidator,
          this.totalBudgetedValidator,
        ],
      }
    );

    return this.constraintsForm;
  }

  get minMaxAreaValue() {
    return calculateMinArea(this.planningAreaAcres);
  }

  get maxMaxAreaValue() {
    return calculateMaxArea(this.planningAreaAcres);
  }

  get maxArea() {
    return this.constraintsForm?.get('physicalConstraintForm.maxArea');
  }

  get maxCost() {
    return this.constraintsForm.get('budgetForm.maxCost');
  }

  standSizeDisabled(standSize: string) {
    return this.planningAreaAcres < STAND_SIZES[standSize] * 10;
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
    this.excludedAreas.forEach((area) => {
      if (
        this.constraintsForm.get('excludedAreasForm.' + area.key)?.valid &&
        this.constraintsForm.get('excludedAreasForm.' + area.key)?.value
      ) {
        if (this.featureService.isFeatureEnabled('statewide_scenarios')) {
          scenarioConfig.excluded_areas?.push(Number(area.id));
        } else {
          scenarioConfig.excluded_areas?.push(area.key as any);
        }
      }
    });
    if (estimatedCost?.valid)
      if (this.featureService.isFeatureEnabled('statewide_scenarios')) {
        scenarioConfig.estimated_cost = parseFloat(estimatedCost.value);
      } else {
        // We should use any until we remove the FF.
        (scenarioConfig as any).est_cost = parseFloat(estimatedCost.value);
      }
    if (maxCost?.valid) scenarioConfig.max_budget = parseFloat(maxCost.value);
    if (maxArea?.valid) {
      if (this.featureService.isFeatureEnabled('statewide_scenarios')) {
        scenarioConfig.max_area = parseFloat(maxArea.value);
      } else {
        // We should use any until we remove the FF.
        (scenarioConfig as any).max_treatment_area_ratio = parseFloat(
          maxArea.value
        );
      }
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
    this.excludedAreas.forEach((area) => {
      const isAreaSelected = this.featureService.isFeatureEnabled(
        'statewide_scenarios'
      )
        ? config.excluded_areas &&
          config.excluded_areas.indexOf(Number(area.key)) > -1
        : config.excluded_areas &&
          config.excluded_areas.includes(area.key.toString() as any);

      if (isAreaSelected) {
        this.constraintsForm
          .get('excludedAreasForm.' + area.key)
          ?.setValue(true);
      } else {
        this.constraintsForm
          .get('excludedAreasForm.' + area.key)
          ?.setValue(false);
      }
    });

    // TODO: remove est_cost when 'statewide_scenarios' be approved
    if (config.estimated_cost || (config as any).est_cost) {
      this.constraintsForm
        .get('budgetForm.estimatedCost')
        ?.setValue(config.estimated_cost || (config as any).est_cost);
    }
    if (config.max_budget) {
      this.constraintsForm
        .get('budgetForm.maxCost')
        ?.setValue(config.max_budget);
    }
    // TODO: remove max_treatment_area_ratio when 'statewide_scenarios' be approved
    if (config.max_area || (config as any).max_treatment_area_ratio) {
      this.constraintsForm
        .get('physicalConstraintForm.maxArea')
        ?.setValue(config.max_area || (config as any).max_treatment_area_ratio);
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

  /**
   * checks that one of budget or treatment area constraints is provided.
   * @param constraintsForm
   * @private
   */
  private budgetOrAreaRequiredValidator(
    constraintsForm: AbstractControl
  ): ValidationErrors | null {
    const maxCost = constraintsForm.get('budgetForm.maxCost');
    const maxArea = constraintsForm.get('physicalConstraintForm.maxArea');
    const valid = !!maxCost?.value || !!maxArea?.value;
    return valid ? null : { [customErrors.budgetOrAreaRequired]: true };
  }

  /**
   * Checks that the maxBudget is enough for the selected estimatedCost per acre
   * @param planningAreaAcres
   * @private
   */
  private totalBudgetedValidator(planningAreaAcres: number): ValidatorFn {
    return (constraintsForm: AbstractControl): ValidationErrors | null => {
      const maxCost = constraintsForm.get('budgetForm.maxCost')?.value;
      const estCostPerAcre = constraintsForm.get(
        'budgetForm.estimatedCost'
      )?.value;
      if (!!maxCost) {
        const hasBudget = hasEnoughBudget(
          planningAreaAcres,
          estCostPerAcre,
          maxCost
        );

        return hasBudget
          ? null
          : {
              [customErrors.notEnoughBudget]: calculateMinBudget(
                planningAreaAcres,
                estCostPerAcre
              ),
            };
      }
      return null;
    };
  }

  calculateMinBudget() {
    const estCostPerAcre = this.constraintsForm.get(
      'budgetForm.estimatedCost'
    )?.value;
    return calculateMinBudget(this.planningAreaAcres, estCostPerAcre);
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
