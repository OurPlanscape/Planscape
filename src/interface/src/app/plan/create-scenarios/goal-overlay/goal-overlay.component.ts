import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TreatmentQuestionConfig } from '../../../types';

@Component({
  selector: 'app-goal-overlay',
  templateUrl: './goal-overlay.component.html',
  styleUrls: ['./goal-overlay.component.scss'],
})
export class GoalOverlayComponent {
  @Input() goal!: TreatmentQuestionConfig | null;
  @Output() closeOverlay = new EventEmitter();

  constructor() {}
}
