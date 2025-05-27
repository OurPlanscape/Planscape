import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-new-create-scenarios',
  standalone: true,
  imports: [],
  templateUrl: './new-create-scenarios.component.html',
  styleUrl: './new-create-scenarios.component.scss',
})
export class NewCreateScenariosComponent {
  scenarioForm = new FormGroup({
    scenarioName: new FormControl({}, [Validators.required]),
    constraints: new FormGroup(
      {
        budgetForm: this.fb.group({
          // Estimated cost in $ per acre
          estimatedCost: [2470, Validators.min(0)],
          // Max cost of treatment for entire planning area
          // Initially disabled, estimatedCost is required as input before maxCost is enabled
          maxCost: ['', Validators.min(0.01)],
        }),
        physicalConstraintForm: new FormGroup({
          // TODO Update if needed once we have confirmation if this is the correct default %
          // Maximum slope allowed for planning area
          maxSlope: new FormControl(null, [
            Validators.min(0),
            Validators.max(100),
          ]),
          // Minimum distance from road allowed for planning area
          minDistanceFromRoad: new FormControl(null, [
            Validators.min(0),
            Validators.max(100000),
          ]),
          // Maximum area to be treated in acres
          // Using 500 as minimum for now. Ideally the minimum should be based on stand size.
          maxArea: new FormControl('', [
            Validators.min(this.minMaxAreaValue),
            Validators.max(this.maxMaxAreaValue),
          ]),
          // Stand Size selection
          standSize: new FormControl('LARGE', [Validators.required]),
        }),
        excludedAreasForm: new FormGroup(excludedAreasChosen),
        excludeAreasByDegrees: new FormControl(true),
        excludeAreasByDistance: new FormControl(true),
        planningAreaAcres: new FormControl(this.planningAreaAcres),
      },
      {
        validators: [
          this.budgetOrAreaRequiredValidator,
          this.totalBudgetedValidator,
        ],
      }
    ),
    priorities: new FormGroup({}),
  });
}
