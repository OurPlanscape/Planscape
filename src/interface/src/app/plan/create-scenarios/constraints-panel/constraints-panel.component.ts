import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';

interface BudgetOptimized {
  useMostOptimizedOutcome: true;
}

interface BudgetCustom {
  minUsd: number;
  maxUsd: number;
  useMostOptimizedOutcome: false;
}

type Budget = BudgetCustom | BudgetOptimized;

// Temporary Constraints type
export interface Constraints {
  budget: Budget;
  treatmentAreaPercentage: {
    min: number;
    max: number;
  };
  projectSize: {
    minAcres: number;
    maxAcres: number;
  };
  treatmentType: string[];
  landOwnership: string[];
  other: {
    excludeAreasByDegrees: boolean;
    excludeAreasByDistance: boolean;
    excludeDistance: number;
  };
}

@Component({
  selector: 'app-constraints-panel',
  templateUrl: './constraints-panel.component.html',
  styleUrls: ['./constraints-panel.component.scss'],
})
export class ConstraintsPanelComponent implements OnInit {
  // TODO: Get and populate previously saved constraints

  @Output()
  changeConstraintsEvent = new EventEmitter<Constraints>();

  treatmentTypes: string[] = [
    'Mechanical Thinning',
    'Prescribed Fire',
    'Broadcast Burn',
    'Fuel Reduction',
    'Fuel Break',
    'Road Way Clearance',
  ];
  landOwnerships: string[] = [
    'Federal',
    'State',
    'Local',
    'Private',
    'Other'
  ];

  constraintsForm = this.fb.group({
    budgetForm: this.fb.group({
      minBudget: [''],
      maxBudget: [''],
      optimizeBudget: [false, Validators.required],
    }),
    treatmentForm: this.fb.group({
      minArea: ['', Validators.required],
      maxArea: ['', Validators.required],
    }),
    projectForm: this.fb.group({
      minAcres: ['', Validators.required],
      maxAcres: ['', Validators.required],
    }),
    treatmentType: [[...this.treatmentTypes]],
    landOwnership: [[...this.landOwnerships]],
    excludeAreasByDegrees: [false],
    excludeAreasByDistance: [false],
    excludeDistance: [''],
  });

  treatmentTypeSelectTriggerText = 'All treatment types selected';
  landOwnershipSelectTriggerText = 'All ownerships selected';

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    // TODO: Save constraints when plan-bottom-bar's "next" is clicked
    this.constraintsForm.valueChanges.subscribe((formValue) => {
      const currentBudget = formValue.budgetForm?.optimizeBudget
        ? {
            useMostOptimizedOutcome: true,
          }
        : {
            useMostOptimizedOutcome: false,
            minUsd: formValue.budgetForm?.minBudget,
            maxUsd: formValue.budgetForm?.maxBudget,
          };

      const currentConstraints = {
        budget: currentBudget,
        treatmentAreaPercentage: {
          min: formValue.treatmentForm?.minArea,
          max: formValue.treatmentForm?.maxArea,
        },
        projectSize: {
          minAcres: formValue.projectForm?.minAcres,
          maxAcres: formValue.projectForm?.maxAcres,
        },
        treatmentType: formValue.treatmentType,
        landOwnership: formValue.landOwnership,
        other: {
          excludeAreasByDegrees: formValue.excludeAreasByDegrees,
          excludeAreasByDistance: formValue.excludeAreasByDistance,
          excludeDistance: formValue.excludeDistance,
        },
      };
      this.changeConstraintsEvent.emit(currentConstraints as any);
    });
  }

  /** Displays the text shown in the mat-select depending on the selections.  */
  handleTreatmentTypeSelected(matSelectChange: MatSelectChange) {
    const allOptions = Array.from(matSelectChange.source.options);
    const allOptionsSelected = allOptions.every((option) => option.selected);
    const someOptionsSelected = allOptions.some((option) => option.selected);

    if (allOptionsSelected) {
      this.treatmentTypeSelectTriggerText = 'All treatment types selected';
    } else if (someOptionsSelected) {
      const selectedOptions = allOptions.filter((option) => option.selected);
      const firstSelectedOption = selectedOptions[0].value;
      if (selectedOptions.length > 1) {
        this.treatmentTypeSelectTriggerText = `${firstSelectedOption} (+ ${selectedOptions.length - 1} more)`;
      } else {
        this.treatmentTypeSelectTriggerText = `${firstSelectedOption}`;
      }
    }
  }

  /** Displays the text shown in the mat-select depending on the selections.  */
  handleOwnershipSelected(matSelectChange: MatSelectChange) {
    const allOptions = Array.from(matSelectChange.source.options);
    const allOptionsSelected = allOptions.every((option) => option.selected);
    const someOptionsSelected = allOptions.some((option) => option.selected);

    if (allOptionsSelected) {
      this.landOwnershipSelectTriggerText = 'All ownership types selected';
    } else if (someOptionsSelected) {
      const selectedOptions = allOptions.filter((option) => option.selected);
      const firstSelectedOption = selectedOptions[0].value;
      if (selectedOptions.length > 1) {
        this.landOwnershipSelectTriggerText = `${firstSelectedOption} (+ ${selectedOptions.length - 1} more)`;
      } else {
        this.landOwnershipSelectTriggerText = `${firstSelectedOption}`;
      }
    }
  }

  toggleRequiredExcludeDistance() {
    this.constraintsForm.controls.excludeDistance.setValidators(
        this.constraintsForm.controls.excludeAreasByDistance.value ? [Validators.required] : null);
    this.constraintsForm.controls.excludeDistance.updateValueAndValidity();
  }
}
