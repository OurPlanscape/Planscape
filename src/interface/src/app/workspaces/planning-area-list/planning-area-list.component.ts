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
        queryParamsService: QueryParamsService
      ) => {
        return new PlanningAreasDataSource(planService, queryParamsService);
      },
      deps: [PlanService, QueryParamsService],
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

  planningAreas$ = this.dataSource.data();
  baseLayerUrl$ = this.mapConfigState.baseMapUrl$;

  minZoom = FrontendConstants.MAPLIBRE_MAP_MIN_ZOOM;
  maxZoom = FrontendConstants.MAPLIBRE_MAP_MAX_ZOOM;

  source = MARTIN_SOURCES.planningArea.sources.planningArea;

  pageOptions = this.dataSource.pageOptions;
  pages$ = this.dataSource.pages$;
  sortDirection: SortDirection = 'desc';

  loading$ = this.dataSource.loading$;

  ngOnInit(): void {
    this.dataSource.loadData();
    this.mapConfigState.setShowMapControls(false);
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
    // TODO: Open upload modal planning area
  }

  drawPlanningArea() {
    // TODO: Navigate to explore and open drawing mode
  }

  ngOnDestroy(): void {
    this.dataSource.destroy();
  }
}
