import { Component, Input } from '@angular/core';
import { now } from 'moment';
import { Plan, Scenario } from 'src/app/types';

@Component({
  selector: 'app-unsaved-scenarios',
  templateUrl: './unsaved-scenarios.component.html',
  styleUrls: ['./unsaved-scenarios.component.scss'],
})
export class UnsavedScenariosComponent {
  @Input() plan: Plan | null = null;
  scenarios: Scenario[];
  displayedColumns: string[] = ['id', 'createdTimestamp'];

  constructor() {
    // TODO (leehana): populate scenarios from plan object
    this.scenarios = [
      {
        id: '1',
        createdTimestamp: now(),
      },
    ];
  }
}
