import { Component, Input, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, take } from 'rxjs';
import { PlanService } from 'src/app/services';
import {
  Plan,
  Scenario,
  ScenarioResult,
  ScenarioResultStatus,
} from 'src/app/types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  parseResultsToProjectAreas,
  parseResultsToTotals,
  POLLING_INTERVAL,
} from '../../plan-helpers';

interface ScenarioRow extends Scenario {
  selected?: boolean;
}

@UntilDestroy()
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
    'completedTimestamp',
  ];

  statusLabels: Record<ScenarioResultStatus, string> = {
    LOADING: 'Loading',
    NOT_STARTED: 'Not Started',
    PENDING: 'Running',
    RUNNING: 'Running',
    SUCCESS: 'Done',
    FAILURE: 'Failed',
  };

  constructor(
    private planService: PlanService,
    private route: ActivatedRoute,
    private router: Router,
    private snackbar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.fetchScenarios();
    this.pollForChanges();
  }

  private pollForChanges() {
    // we might want to check if any scenario is still pending in order to poll
    interval(POLLING_INTERVAL)
      .pipe(untilDestroyed(this))
      .subscribe(() => this.fetchScenarios());
  }

  fetchScenarios(): void {
    this.planService
      .getScenariosForPlan(this.plan?.id!)
      .pipe(take(1))
      .subscribe((scenarios) => {
        this.scenarios = scenarios;
      });
  }

  openConfig(configId?: number): void {
    if (!configId) {
      this.router.navigate(['config', ''], {
        relativeTo: this.route,
      });
    } else {
      this.router.navigate(['config', configId], { relativeTo: this.route });
    }
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
    this.planService.deleteScenarios([this.highlightedId!]).subscribe({
      next: (deletedIds) => {
        this.snackbar.open(
          `Deleted scenario${deletedIds.length > 1 ? 's' : ''}`
        );
        this.fetchScenarios();
      },
      error: (err) => {
        this.snackbar.open(`Error: ${err}`);
      },
    });
  }

  calculateTotals(results: ScenarioResult) {
    const projectAreas = parseResultsToProjectAreas(results);
    const total = parseResultsToTotals(projectAreas);
    return total;
  }
}
