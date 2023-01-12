import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-plan-bottom-bar',
  templateUrl: './plan-bottom-bar.component.html',
  styleUrls: ['./plan-bottom-bar.component.scss'],
})
export class PlanBottomBarComponent {
  @Output() nextEvent = new EventEmitter<void>();
  @Output() previousEvent = new EventEmitter<void>();
}
