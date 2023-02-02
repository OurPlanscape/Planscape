import { Component, Input, Output, EventEmitter } from '@angular/core';
import { now } from 'moment';
import { Plan, Scenario } from 'src/app/types';

@Component({
  selector: 'app-saved-scenarios',
  templateUrl: './saved-scenarios.component.html',
  styleUrls: ['./saved-scenarios.component.scss'],
})
export class SavedScenariosComponent {
  @Input() plan: Plan | null = null;
  @Output() createScenarioEvent = new EventEmitter<void>();

  scenarios: Scenario[];
  displayedColumns: string[] = ['id', 'createdTimestamp'];

  constructor() {
    // TODO (leehana): query scenarios from backend
    this.scenarios = [];
  }

  createScenario(): void {
    this.createScenarioEvent.emit();
  }
}
