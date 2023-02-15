import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { PlanService } from 'src/app/services';
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

  constructor(
    private planService: PlanService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // TODO (leehana): query scenarios from backend, fake scenarios below.
    this.scenarios = [
      {
        id: '20',
        createdTimestamp: 12300000,
      },
      {
        id: '21',
        createdTimestamp: 12300000,
      },
    ];
  }

  createScenario(): void {
    this.createScenarioEvent.emit();
  }

  viewScenario(id: string): void {
    this.router.navigate(['scenario', id], { relativeTo: this.route });
  }
}
