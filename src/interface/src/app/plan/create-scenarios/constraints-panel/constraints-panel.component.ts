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

  enableMaxCost(): boolean {
    return !!this.constraintsForm?.get('treatmentForm.maxArea')?.value;
  }

  toggleRequiredExcludeDistance() {
    this.constraintsForm!.controls['excludeDistance'].setValidators(
      this.constraintsForm!.controls['excludeAreasByDistance'].value
        ? [Validators.required]
        : null
    );
    this.constraintsForm!.controls['excludeDistance'].updateValueAndValidity();
  }

  toggleRequiredExcludeSlope() {
    this.constraintsForm!.controls['excludeSlope'].setValidators(
      this.constraintsForm!.controls['excludeAreasByDegrees'].value
        ? [Validators.required]
        : null
    );
    this.constraintsForm!.controls['excludeSlope'].updateValueAndValidity();
  }
}
