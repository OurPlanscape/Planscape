import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { PlanService } from 'src/app/services';
import { Plan, Scenario } from 'src/app/types';

interface ScenarioRow extends Scenario {
  selected?: boolean;
  starred?: boolean;
}

@Component({
  selector: 'app-saved-scenarios',
  templateUrl: './saved-scenarios.component.html',
  styleUrls: ['./saved-scenarios.component.scss'],
})
export class SavedScenariosComponent implements OnInit {
  @Input() plan: Plan | null = null;
  @Output() createScenarioEvent = new EventEmitter<void>();

  scenarios: ScenarioRow[] = [];
  displayedColumns: string[] = [
    'id',
    'starred',
    'projectAreas',
    'acresTreated',
    'estimatedCost',
    'status',
    'owner',
    'createdTimestamp',
  ];

  constructor(
    private planService: PlanService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.planService
      .getScenariosForPlan(this.plan?.id!)
      .pipe(take(1))
      .subscribe((scenarios) => {
        this.scenarios = scenarios;
      });
  }

  createScenario(): void {
    this.createScenarioEvent.emit();
  }

  viewScenario(id?: string): void {
    if (!id) {
      id = this.scenarios.find((scenario) => scenario.selected)?.id;
    }
    this.router.navigate(['scenario', id], { relativeTo: this.route });
  }

  showDeleteButton(): boolean {
    return this.scenarios.filter((scenario) => scenario.selected).length > 0;
  }

  showViewButton(): boolean {
    return this.scenarios.filter((scenario) => scenario.selected).length === 1;
  }

  deleteSelectedScenarios(): void {
    console.log(
      'Deleting scenarios',
      this.scenarios
        .filter((scenario) => scenario.selected)
        .map((scenario) => scenario.id)
    );
  }
}
