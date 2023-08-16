import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-constraints-panel',
  templateUrl: './constraints-panel.component.html',
  styleUrls: ['./constraints-panel.component.scss'],
})
export class ConstraintsPanelComponent {
  @Input() constraintsForm: FormGroup | undefined;
  standSizeOptions: Array<String> = ["Small", "Medium", "Large"];
}
