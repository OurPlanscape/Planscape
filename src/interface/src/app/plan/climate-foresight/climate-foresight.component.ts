import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { ClimateForesightRunCardComponent } from '@plan/climate-foresight/climate-foresight-run-card/climate-foresight-run-card.component';
import { ActivatedRoute, Router } from '@angular/router';
import { PlanState } from '../plan.state';
import { SharedModule } from '@shared/shared.module';
import { Plan, ClimateForesightRun } from '@types';
import { take, map, switchMap, takeUntil } from 'rxjs/operators';
import { interval, Subject } from 'rxjs';
import { ClimateForesightService } from '@services/climate-foresight.service';
import { DeleteRunModalComponent } from '@plan/climate-foresight/delete-run-modal/delete-run-modal.component';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { ButtonComponent, SectionComponent } from '@styleguide';
import { PlanningAreaLayerComponent } from '@maplibre-map/planning-area-layer/planning-area-layer.component';
import {
  Map as MapLibreMap,
  RequestTransformFunction,
  ResourceType,
} from 'maplibre-gl';
import { AuthService } from '@services';
import { MapConfigState } from '@maplibre-map/map-config.state';
import {
  addRequestHeaders,
  getBoundsFromGeometry,
} from '@maplibre-map/maplibre.helper';
import { FrontendConstants } from '@map/map.constants';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { NewAnalysisModalComponent } from '@plan/climate-foresight/new-analysis-modal/new-analysis-modal.component';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { SNACK_BOTTOM_NOTICE_CONFIG } from '@shared';
import {
  canDeleteClimateAnalysis,
  canRunClimateAnalysis,
} from '../permissions';

const POLLING_INTERVAL = 5000; // 5 seconds

@UntilDestroy()
@Component({
  selector: 'app-climate-foresight',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    MatListModule,
    MatCardModule,
    ButtonComponent,
    SharedModule,
    MapComponent,
    PlanningAreaLayerComponent,
    ClimateForesightRunCardComponent,
    SectionComponent,
    DecimalPipe,
  ],
  templateUrl: './climate-foresight.component.html',
  styleUrls: ['./climate-foresight.component.scss'],
})
export class ClimateForesightComponent implements OnInit, OnDestroy {
  hasRuns = false;
  currentPlan: Plan | null = null;
  mapLibreMap?: MapLibreMap;
  runs: ClimateForesightRun[] = [];
  loading = false;

  minZoom = FrontendConstants.MAPLIBRE_MAP_MIN_ZOOM;
  maxZoom = FrontendConstants.MAPLIBRE_MAP_MAX_ZOOM;

  baseLayerUrl$ = this.mapConfigState.baseMapUrl$;

  private stopPolling$ = new Subject<void>();

  bounds$ = this.planState.planningAreaGeometry$.pipe(
    map((geometry) => {
      if (!geometry) {
        return null;
      }
      const bounds = getBoundsFromGeometry(geometry);
      if (bounds?.every((coord) => isFinite(coord))) {
        return bounds;
      }
      return null;
    })
  );

  constructor(
    private breadcrumbService: BreadcrumbService,
    private router: Router,
    private route: ActivatedRoute,
    private planState: PlanState,
    private authService: AuthService,
    private mapConfigState: MapConfigState,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private climateForesightService: ClimateForesightService
  ) {}

  ngOnInit(): void {
    this.planState.currentPlan$.pipe(take(1)).subscribe((plan) => {
      if (plan) {
        this.currentPlan = plan;

        this.breadcrumbService.breadcrumb$
          .pipe(take(1))
          .subscribe((breadcrumb) => {
            if (breadcrumb?.label !== 'Climate Foresight') {
              this.breadcrumbService.updateBreadCrumb({
                label: 'Climate Foresight',
                backUrl: `/plan/${this.currentPlan?.id}`,
              });
            }
          });

        // Load existing runs for this planning area
        this.loadRuns();
      }
    });
  }

  mapLoaded(map: MapLibreMap): void {
    this.mapLibreMap = map;
  }

  /**
   * Add authorization headers to map tile requests
   */
  transformRequest: RequestTransformFunction = (
    url: string,
    resourceType?: ResourceType
  ) => {
    return addRequestHeaders(
      url,
      resourceType,
      this.authService.getAuthCookie()
    );
  };

  navigateBack(): void {
    const planId = this.route.snapshot.data['planId'];
    if (planId) {
      this.router.navigate(['/plan', planId]);
    } else {
      this.router.navigate(['/']);
    }
  }

  startRun(): void {
    if (!this.currentPlan || !this.canRun) {
      return;
    }

    const dialogRef = this.dialog.open(NewAnalysisModalComponent, {
      data: {
        mode: 'new',
        planningAreaId: this.currentPlan.id,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.createRun(result);
      }
    });
  }

  private createRun(payload: { name: string; planning_area: number }): void {
    this.loading = true;
    this.climateForesightService.createRun(payload).subscribe({
      next: (run) => {
        this.runs.unshift(run);
        this.hasRuns = true;
        this.loading = false;
        this.snackBar.open(
          'Run created successfully',
          'Close',
          SNACK_BOTTOM_NOTICE_CONFIG
        );
        this.openRun(run);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          'Failed to create run',
          'Close',
          SNACK_BOTTOM_NOTICE_CONFIG
        );
        console.error('Error creating run:', error);
      },
    });
  }

  private loadRuns(): void {
    if (!this.currentPlan) {
      return;
    }

    this.loading = true;
    this.climateForesightService
      .listRunsByPlanningArea(this.currentPlan.id)
      .subscribe({
        next: (runs) => {
          this.runs = runs;
          this.hasRuns = runs.length > 0;
          this.loading = false;

          this.startPollingIfNeeded();
        },
        error: (error) => {
          this.loading = false;
          console.error('Error loading runs:', error);
        },
      });
  }

  openRun(run: ClimateForesightRun): void {
    if (run.status === 'done') {
      this.router.navigate(['run', run.id, 'analysis'], {
        relativeTo: this.route,
      });
    } else {
      this.router.navigate(['run', run.id], { relativeTo: this.route });
    }
  }

  deleteRun(run: ClimateForesightRun): void {
    const dialogRef = this.dialog.open(DeleteRunModalComponent, {
      data: {
        runName: run.name,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.climateForesightService.deleteRun(run.id).subscribe({
          next: () => {
            this.runs = this.runs.filter((r) => r.id !== run.id);
            this.hasRuns = this.runs.length > 0;
            this.snackBar.open(
              `"${run.name}" has been deleted`,
              'Close',
              SNACK_BOTTOM_NOTICE_CONFIG
            );
          },
          error: (error) => {
            this.snackBar.open(
              'Failed to delete run',
              'Close',
              SNACK_BOTTOM_NOTICE_CONFIG
            );
            console.error('Error deleting run:', error);
          },
        });
      }
    });
  }

  copyRun(run: ClimateForesightRun): void {
    const dialogRef = this.dialog.open(NewAnalysisModalComponent, {
      data: {
        mode: 'copy',
        runId: run.id,
        runName: run.name,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.climateForesightService.copyRun(run.id, result.name).subscribe({
          next: (newRun) => {
            this.runs.unshift(newRun);
            this.hasRuns = true;
            this.snackBar.open(
              'Run copied successfully',
              'Close',
              SNACK_BOTTOM_NOTICE_CONFIG
            );
            this.openRun(newRun);
          },
          error: (error) => {
            this.snackBar.open(
              'Failed to copy run',
              'Close',
              SNACK_BOTTOM_NOTICE_CONFIG
            );
            console.error('Error copying run:', error);
          },
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.stopPolling$.next();
    this.stopPolling$.complete();
  }

  /**
   * Start polling for run status updates if any runs are in 'running' status
   */
  private startPollingIfNeeded(): void {
    const hasRunningRuns = this.runs.some((run) => run.status === 'running');

    if (!hasRunningRuns || !this.currentPlan) {
      return;
    }

    this.stopPolling$.next();

    interval(POLLING_INTERVAL)
      .pipe(
        untilDestroyed(this),
        takeUntil(this.stopPolling$),
        switchMap(() =>
          this.climateForesightService.listRunsByPlanningArea(
            this.currentPlan!.id
          )
        )
      )
      .subscribe({
        next: (runs) => {
          this.runs = runs;

          const stillHasRunningRuns = runs.some(
            (run) => run.status === 'running'
          );

          if (!stillHasRunningRuns) {
            this.stopPolling$.next();
            this.snackBar.open(
              'All analyses completed!',
              'Close',
              SNACK_BOTTOM_NOTICE_CONFIG
            );
          }
        },
        error: (err) => {
          console.error('Error polling for run status:', err);
        },
      });
  }

  get canRun(): boolean {
    const user = this.authService.currentUser();
    if (!user || !this.currentPlan) {
      return false;
    }
    return canRunClimateAnalysis(this.currentPlan, user);
  }

  get canDelete(): boolean {
    const user = this.authService.currentUser();
    if (!user || !this.currentPlan) {
      return false;
    }
    return canDeleteClimateAnalysis(this.currentPlan, user);
  }

  get runTooltip(): string {
    if (!this.canRun) {
      return `You don't have permission to Start Analysis`;
    }
    return 'Start Analysis';
  }
}
