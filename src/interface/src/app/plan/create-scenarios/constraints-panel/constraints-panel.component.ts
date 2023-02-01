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

  toggleRequiredExcludeDistance() {
    this.constraintsForm!.controls['excludeDistance'].setValidators(
      this.constraintsForm!.controls['excludeDistance'].value
        ? [Validators.required]
        : null
    );
    this.constraintsForm!.controls['excludeDistance'].updateValueAndValidity();
  }
}
