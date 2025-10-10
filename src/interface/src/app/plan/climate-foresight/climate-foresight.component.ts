import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { ClimateForesightRunCardComponent } from './climate-foresight-run-card/climate-foresight-run-card.component';
import { ActivatedRoute, Router } from '@angular/router';
import { PlanState } from '../plan.state';
import { SharedModule } from '../../shared/shared.module';
import { Plan, ClimateForesightRun } from '@types';
import { take, map } from 'rxjs/operators';
import { ClimateForesightService } from '@services/climate-foresight.service';
import { NewRunModalComponent } from './new-run-modal/new-run-modal.component';
import { DeleteRunModalComponent } from './delete-run-modal/delete-run-modal.component';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { ButtonComponent } from '@styleguide';
import { PlanningAreaLayerComponent } from '../../maplibre-map/planning-area-layer/planning-area-layer.component';
import {
  Map as MapLibreMap,
  RequestTransformFunction,
  ResourceType,
} from 'maplibre-gl';
import { AuthService } from '@services';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import {
  addRequestHeaders,
  getBoundsFromGeometry,
} from '../../maplibre-map/maplibre.helper';
import { FrontendConstants } from '../../map/map.constants';
import { BreadcrumbService } from '@services/breadcrumb.service';

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
  ],
  templateUrl: './climate-foresight.component.html',
  styleUrls: ['./climate-foresight.component.scss'],
})
export class ClimateForesightComponent implements OnInit {
  planName = '';
  planAcres = '';
  hasRuns = false;
  currentPlan: Plan | null = null;
  mapLibreMap?: MapLibreMap;
  runs: ClimateForesightRun[] = [];
  loading = false;

  minZoom = FrontendConstants.MAPLIBRE_MAP_MIN_ZOOM;
  maxZoom = FrontendConstants.MAPLIBRE_MAP_MAX_ZOOM;

  baseLayerUrl$ = this.mapConfigState.baseMapUrl$;

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
        this.planName = plan.name;
        this.planAcres = plan.area_acres
          ? `Acres: ${plan.area_acres.toLocaleString()}`
          : '';

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
    if (!this.currentPlan) {
      return;
    }

    const dialogRef = this.dialog.open(NewRunModalComponent, {
      data: {
        planningAreaId: this.currentPlan.id,
        planningAreaName: this.currentPlan.name,
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
        this.snackBar.open('Run created successfully', 'Close', {
          duration: 3000,
        });
        this.openRun(run);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open('Failed to create run', 'Close', {
          duration: 3000,
        });
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
        },
        error: (error) => {
          this.loading = false;
          console.error('Error loading runs:', error);
        },
      });
  }

  openRun(run: ClimateForesightRun): void {
    this.router.navigate(['run', run.id], { relativeTo: this.route });
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
            this.snackBar.open(`"${run.name}" has been deleted`, 'Close', {
              duration: 3000,
            });
          },
          error: (error) => {
            this.snackBar.open('Failed to delete run', 'Close', {
              duration: 3000,
            });
            console.error('Error deleting run:', error);
          },
        });
      }
    });
  }
}
