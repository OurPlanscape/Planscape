import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { PlanService } from 'src/app/services';
import { Plan, Scenario } from 'src/app/types';

interface ScenarioRow extends Scenario {
  selected?: boolean;
}

@Component({
  selector: 'app-saved-scenarios',
  templateUrl: './saved-scenarios.component.html',
  styleUrls: ['./saved-scenarios.component.scss'],
})
export class SavedScenariosComponent implements OnInit {
  @Input() plan: Plan | null = null;

  readonly text1: string = `
    Scenarios consist of prioritized project areas for treatment within this planning area,
    estimated cost ranges, and notes. Copy links to share, download shape files, and more.
    View conditions of each priority within the Map Layers tab. Anyone with visibility access to
    this planning area can also view all the scenarios within it.
  `;

  highlightedId: string | null = null;
  scenarios: ScenarioRow[] = [];
  displayedColumns: string[] = [
    'name',
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
    private router: Router,
    private snackbar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.fetchScenarios();
  }

  fetchScenarios(): void {
    this.planService
      .getScenariosForPlan(this.plan?.id!)
      .pipe(take(1))
      .subscribe((scenarios) => {
        this.scenarios = scenarios;
      });
  }

  viewScenario(): void {
    this.router.navigate(['config', this.highlightedId], {
      relativeTo: this.route,
    });
  }

  highlightScenario(id: string): void {
    this.highlightedId = id;
  }

  deleteSelectedScenarios(): void {
    // Bulk scenario deletion isn't possible with the current UI, 
    // but logic to make 'scenario' plural if more than one scenario is deleted was kept from legacy code
    this.planService
      .deleteScenarios([this.highlightedId!])
      .subscribe({
        next: (deletedIds) => {
          this.snackbar.open(
            `Deleted scenario${
              deletedIds.length > 1 ? 's' : ''
            }`
          );
          this.fetchScenarios();
        },
        error: (err) => {
          this.snackbar.open(`Error: ${err}`);
        },
      });
  }
}
