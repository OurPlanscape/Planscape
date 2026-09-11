import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AuthService, PlanService } from '@app/services';
import { PlanningAreasDataSource } from '@app/standalone/planning-areas/planning-areas.datasource';
import {
  DEFAULT_SORT_OPTIONS,
  QueryParamsService,
} from '@app/standalone/planning-areas/query-params.service';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { PlanningAreaCardComponent } from '@styleguide/planning-area-card/planning-area-card.component';
import { PlanningAreaLayerComponent } from '@app/maplibre-map/planning-area-layer/planning-area-layer.component';
import { EventData, MapComponent, MapService } from '@maplibre/ngx-maplibre-gl';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { addRequestHeaders } from '@app/maplibre-map/maplibre.helper';
import { FrontendConstants } from '@app/map/map.constants';
import { RequestTransformFunction } from 'maplibre-gl';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';
import { MARTIN_SOURCES } from '@app/treatments/map.sources';
import { ButtonComponent, PaginatorComponent } from '@styleguide';
import { SortDirection } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { PreviewPlan } from '@app/types';
import { ActivatedRoute, Router } from '@angular/router';
import { PlanningAreaEmptyStateComponent } from '../planning-area-empty-state/planning-area-empty-state.component';
import { PlanningAreaCreationModalComponent } from '../planning-area-creation-modal/planning-area-creation-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { POLLING_INTERVAL } from '@app/plan/plan-helpers';
import { catchError, EMPTY, exhaustMap, interval } from 'rxjs';

@UntilDestroy()
@Component({
  selector: 'app-planning-area-list',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    PlanningAreaCardComponent,
    AsyncPipe,
    PlanningAreaLayerComponent,
    MapComponent,
    PaginatorComponent,
    MatIconModule,
    ButtonComponent,
    MatProgressSpinnerModule,
    MatMenuModule,
    PlanningAreaEmptyStateComponent,
  ],
  providers: [
    PlanService,
    MapService,
    MapConfigState,
    NewScenarioState,
    QueryParamsService,
    {
      provide: DEFAULT_SORT_OPTIONS,
      useValue: { active: 'latest_updated', direction: 'desc' },
    },
    {
      provide: PlanningAreasDataSource,
      useFactory: (
        planService: PlanService,
        queryParamsService: QueryParamsService,
        route: ActivatedRoute
      ) => {
        const workspaceId = route.snapshot.data['workspaceId'];
        return new PlanningAreasDataSource(
          planService,
          queryParamsService,
          workspaceId
        );
      },
      deps: [PlanService, QueryParamsService, ActivatedRoute],
    },
  ],
  templateUrl: './planning-area-list.component.html',
  styleUrl: './planning-area-list.component.scss',
})
export class PlanningAreaListComponent implements OnInit, OnDestroy {
  public dataSource = inject(PlanningAreasDataSource);
  public mapService = inject(MapService);
  public mapConfigState = inject(MapConfigState);
  public authService = inject(AuthService);
  public newScenarioState = inject(NewScenarioState);
  public router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);

  planningAreas$ = this.dataSource.data();
  baseLayerUrl$ = this.mapConfigState.baseMapUrl$;

  minZoom = FrontendConstants.MAPLIBRE_MAP_MIN_ZOOM;
  maxZoom = FrontendConstants.MAPLIBRE_MAP_MAX_ZOOM;

  source = MARTIN_SOURCES.planningArea.sources.planningArea;

  pageOptions = this.dataSource.pageOptions;
  pages$ = this.dataSource.pages$;
  sortDirection: SortDirection = 'desc';

  loading$ = this.dataSource.loading$;

  workspaceId = this.route.snapshot.data['workspaceId'];

  ngOnInit(): void {
    this.dataSource.loadData();
    this.mapConfigState.setShowMapControls(false);
    this.pollForChanges();
  }

  private pollForChanges() {
    interval(POLLING_INTERVAL)
      .pipe(
        // refresh in the background; ignore ticks while a refresh is in flight
        exhaustMap(() =>
          this.dataSource.refresh().pipe(
            // keep the poller alive on errors
            catchError(() => EMPTY)
          )
        ),
        untilDestroyed(this)
      )
      .subscribe();
  }

  onMapError(event: ErrorEvent & EventData) {
    const status = (event.error as any)?.status;
    if (status >= 500 && status < 600) {
      this.newScenarioState.showMapError();
    }
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());

  search(str: string) {
    this.dataSource.search(str);
  }

  changeSort() {
    this.sortDirection = this.sortDirection === 'desc' ? 'asc' : 'desc';

    this.dataSource.changeSort({
      active: 'created_at',
      direction: this.sortDirection,
    });
  }

  goToPage(page: number) {
    this.dataSource.goToPage(page);
  }

  changePageSize(size: number) {
    this.dataSource.changePageSize(size);
  }

  uploadPlanningArea() {
    this.dialog
      .open(PlanningAreaCreationModalComponent, {
        data: {
          workspaceId: this.workspaceId,
        },
      })
      .afterClosed()
      .subscribe((reload) => {
        if (reload === true) {
          this.reload();
        }
      });
  }

  drawPlanningArea() {
    // TODO: Navigate to explore and open drawing mode
  }

  ngOnDestroy(): void {
    this.dataSource.destroy();
  }

  reload() {
    this.dataSource.loadData();
  }

  trackById(_index: number, planningArea: PreviewPlan) {
    return planningArea.id;
  }

  handlePlanningAreaClick(planningArea: PreviewPlan) {
    this.router.navigate(['plan', planningArea.id]);
    return;
  }
}
