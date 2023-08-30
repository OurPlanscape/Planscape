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
    this.planService
      .deleteScenarios(
        this.scenarios
          .filter((scenario) => scenario.selected)
          .map((scenario) => scenario.id)
      )
      .subscribe({
        next: (deletedIds) => {
          this.snackbar.open(
            `Deleted ${deletedIds.length} scenario${
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

  toggleFavorited(scenario: ScenarioRow): void {
    scenario.favorited = !scenario.favorited;
    if (scenario.favorited) {
      this.planService.favoriteScenario(scenario.id).pipe(take(1)).subscribe();
    } else {
      this.planService
        .unfavoriteScenario(scenario.id)
        .pipe(take(1))
        .subscribe();
    }
  }
}
