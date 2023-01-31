import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-plan-navigation-bar',
  templateUrl: './plan-navigation-bar.component.html',
  styleUrls: ['./plan-navigation-bar.component.scss'],
})
export class PlanNavigationBarComponent {
  @Output() backToOverviewEvent = new EventEmitter<void>();
}
