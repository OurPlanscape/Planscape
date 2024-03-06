import { Component, Input, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services';
import { interval, take } from 'rxjs';
import { Plan, Scenario } from 'src/app/types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { POLLING_INTERVAL } from '../../plan-helpers';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DeleteDialogComponent } from '../../../delete-dialog/delete-dialog.component';
import {
  SNACK_ERROR_CONFIG,
  SNACK_NOTICE_CONFIG,
} from '../../../../app/shared/constants';

import { ScenarioService } from '../../../services/scenario.service';

export interface ScenarioRow extends Scenario {
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
  user$ = this.authService.loggedInUser$;

  highlightedScenarioRow: ScenarioRow | null = null;
  loading = true;
  activeScenarios: ScenarioRow[] = [];
  archivedScenarios: ScenarioRow[] = [];
  showOnlyMyScenarios: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private snackbar: MatSnackBar,
    private dialog: MatDialog,
    private scenarioService: ScenarioService
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
    this.scenarioService
      .getScenariosForPlan(this.plan?.id!)
      .pipe(take(1))
      .subscribe((scenarios) => {
        this.activeScenarios = scenarios.filter((s) => s.status === 'ACTIVE');
        this.archivedScenarios = scenarios.filter(
          (s) => s.status === 'ARCHIVED'
        );
        this.loading = false;
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
    this.router.navigate(['config', this.highlightedScenarioRow?.id], {
      relativeTo: this.route,
    });
  }

  confirmDeleteScenario(): void {
    const dialogRef: MatDialogRef<DeleteDialogComponent> = this.dialog.open(
      DeleteDialogComponent,
      {
        data: {
          name: '"' + this.highlightedScenarioRow?.name + '"',
        },
      }
    );
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.deleteScenario([this.highlightedScenarioRow?.id!]);
        }
      });
  }

  private deleteScenario(ids: string[]) {
    this.scenarioService.deleteScenarios(ids).subscribe({
      next: (deletedIds) => {
        this.snackbar.open(
          `Deleted scenario${deletedIds.length > 1 ? 's' : ''}`,
          'Dismiss',
          SNACK_NOTICE_CONFIG
        );
        this.fetchScenarios();
      },
      error: (err) => {
        this.snackbar.open(`Error: ${err}`, 'Dismiss', SNACK_ERROR_CONFIG);
      },
    });
  }

  highlightScenario(row: ScenarioRow): void {
    this.highlightedScenarioRow = row;
  }
}
