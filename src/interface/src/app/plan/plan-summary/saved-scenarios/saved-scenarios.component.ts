import { Component, Input, OnInit } from '@angular/core';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, ScenarioService } from '@services';
import { interval, take } from 'rxjs';
import { Plan, Scenario } from '@types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { isValidTotalArea, POLLING_INTERVAL } from '../../plan-helpers';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { canAddScenario } from '../../permissions';
import {
  SNACK_BOTTOM_NOTICE_CONFIG,
  SNACK_ERROR_CONFIG,
  SNACK_NOTICE_CONFIG,
} from '@shared';
import { MatTab } from '@angular/material/tabs';
import { DeleteDialogComponent } from '../../../standalone/delete-dialog/delete-dialog.component';
import { UploadProjectAreasModalComponent } from '../../upload-project-areas-modal/upload-project-areas-modal.component';

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
  showOnlyMyScenarios: boolean = false;
  activeScenarios: ScenarioRow[] = [];
  archivedScenarios: ScenarioRow[] = [];
  scenariosForUser: ScenarioRow[] = [];
  selectedTabIndex = 0;
  totalScenarios = 0;

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
        this.totalScenarios = scenarios.length;

        this.scenariosForUser = this.showOnlyMyScenarios
          ? scenarios.filter((s) => s.user === this.user$.value?.id)
          : scenarios;
        this.activeScenarios = this.scenariosForUser.filter(
          (s) => s.status === 'ACTIVE'
        );
        this.archivedScenarios = this.scenariosForUser.filter(
          (s) => s.status === 'ARCHIVED'
        );
        this.loading = false;
      });
  }

  get canAddScenarioForPlan(): boolean {
    if (!this.plan) {
      return false;
    }
    return canAddScenario(this.plan);
  }

  get showArchiveScenario() {
    if (!this.plan) {
      return false;
    }
    // Users that can add scenarios can potentially archive them.
    // Users that cannot add scenarios can never archive/restore.
    return this.plan.permissions.includes('add_scenario');
  }

  get canArchiveScenario() {
    if (!this.plan || !this.highlightedScenarioRow) {
      return false;
    }
    const user = this.authService.currentUser();
    return (
      user?.id === this.plan.user ||
      user?.id == this.highlightedScenarioRow?.user
    );
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

  toggleScenarioStatus(archive: boolean) {
    const id = this.highlightedScenarioRow?.id;

    if (id) {
      this.scenarioService.toggleScenarioStatus(Number(id), archive).subscribe({
        next: () => {
          this.snackbar.open(
            `"${this.highlightedScenarioRow?.name}" has been ${
              archive ? 'archived' : 'restored'
            }`,
            'Dismiss',
            SNACK_BOTTOM_NOTICE_CONFIG
          );
          this.highlightedScenarioRow = null;
          this.fetchScenarios();
        },
        error: (err) => {
          this.snackbar.open(
            `Error: ${err.error.error}`,
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
        },
      });
    }
  }

  tabChange(data: { index: number; tab: MatTab }) {
    this.selectedTabIndex = data.index;
    // reset selected row when changing tabs.
    this.highlightedScenarioRow = null;
  }

  get isValidPlanningArea() {
    if (!this.plan) {
      return false;
    }
    return isValidTotalArea(this.plan.area_acres);
  }

  openUploadDialog(): void {
    this.dialog
      .open(UploadProjectAreasModalComponent, {
        data: {
          planning_area_name: this.plan?.name,
          planId: this.plan?.id,
        },
      })
      .afterClosed()
      .subscribe((data) => {
        if (data?.deletedAccount) {
          this.router.navigate(['login']);
        }
      });
  }
}
