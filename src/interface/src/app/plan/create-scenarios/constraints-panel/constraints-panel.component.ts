import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-constraints-panel',
  templateUrl: './constraints-panel.component.html',
  styleUrls: ['./constraints-panel.component.scss'],
})
export class ConstraintsPanelComponent {
  @Input() constraintsForm: FormGroup | undefined;
  @Output() formNextEvent = new EventEmitter<void>();
  @Output() formBackEvent = new EventEmitter<void>();

  hasBudgetOrMaxArea(): boolean {
    return (
      !!this.constraintsForm?.get('budgetForm.maxBudget')?.value ||
      !!this.constraintsForm?.get('budgetForm.optimizeBudget')?.value ||
      !!this.constraintsForm?.get('treatmentForm.maxArea')?.value
    );
  }

  maxBudgetRequired(): boolean {
    return (
      !this.constraintsForm?.get('budgetForm.optimizeBudget')?.value &&
      !this.constraintsForm?.get('treatmentForm.maxArea')?.value
    );
  }

  toggleRequiredExcludeDistance() {
    this.constraintsForm!.controls['excludeDistance'].setValidators(
      this.constraintsForm!.controls['excludeDistance'].value
        ? [Validators.required]
        : null
    );
    this.constraintsForm!.controls['excludeDistance'].updateValueAndValidity();
  }
}
