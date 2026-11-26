import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { CardLinkComponent, OverlayLoaderComponent } from '@styleguide';
import { DashboardLayoutComponent } from '@styleguide/dashboard-layout/dashboard-layout.component';
import { DetailsCardComponent } from '@styleguide/details-card/details-card.component';
import { WorkspaceState } from '../workspace.state';
import { canManageDataLayers } from '../data-layer-access';
import { WorkspaceActionsService } from '../workspace-actions.service';
import { AsyncPipe, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ResourceUnavailableComponent } from '@app/shared/resource-unavailable/resource-unavailable.component';
import { PlanningAreaListComponent } from '../planning-area-list/planning-area-list.component';
import {
  DATALAYER_UPLOAD_EVENTS,
  Pagination,
  Workspace,
  WorkspaceDataLayer,
} from '@types';
import { WebSocketService } from '@app/services';
import { WorkspaceDataLayersService } from '@services/workspace-data-layers.service';
import { catchError, map, merge, of, switchMap } from 'rxjs';
import { FeatureService } from '@app/features/feature.service';

@Component({
  selector: 'app-workspace-dashboard',
  standalone: true,
  imports: [
    DashboardLayoutComponent,
    NavBarComponent,
    DetailsCardComponent,
    CardLinkComponent,
    AsyncPipe,
    NgIf,
    OverlayLoaderComponent,
    ResourceUnavailableComponent,
    PlanningAreaListComponent,
    MatIconModule,
  ],
  templateUrl: './workspace-dashboard.component.html',
  providers: [MapConfigService],

  styleUrl: './workspace-dashboard.component.scss',
})
export class WorkspaceDashboardComponent implements OnInit {
  private breadcrumbService = inject(BreadcrumbService);
  private route = inject(ActivatedRoute);
  private workspaceState = inject(WorkspaceState);
  private workspaceActionsService = inject(WorkspaceActionsService);
  private router: Router = inject(Router);
  private featureService: FeatureService = inject(FeatureService);
  private workspaceDataLayersService = inject(WorkspaceDataLayersService);
  private webSocketService = inject(WebSocketService);

  workspaceId = this.route.snapshot.data['workspaceId'];

  currentWorkspace$ = this.workspaceState.currentWorkspace$;

  isWorkspaceLoading$ = this.workspaceState.isWorkspaceLoading$;

  workspaceNotFound$ = this.workspaceState.workspaceNotFound$;

  dataLayersSummary$ = merge(
    of(null),
    this.webSocketService.workspaceUpdates$(DATALAYER_UPLOAD_EVENTS)
  ).pipe(
    switchMap(() =>
      this.workspaceDataLayersService
        .listDataLayers(this.workspaceId, SUMMARY_PAGE_SIZE, 0)
        .pipe(
          map(dataLayersSummary),
          catchError(() => of(null))
        )
    )
  );

  canShare(workspace: Workspace): boolean {
    return workspace.permissions.includes('add_collaborator');
  }

  shareWorkspace(workspace: Workspace) {
    this.workspaceActionsService.shareWorkspace(workspace);
  }

  ngOnInit(): void {
    this.breadcrumbService.updateBreadCrumb({
      label: 'Home ',
      backUrl: '/home',
    });
  }

  canManageDataLayers(workspace: Workspace): boolean {
    return canManageDataLayers(workspace, this.featureService);
  }

  goToDataLayers() {
    this.router.navigate(['/workspace', this.workspaceId, 'datalayers']);
  }

  handleNavigation() {
    this.router.navigate(['/map-viewer/workspace', this.workspaceId]);
  }

  get subLabelText(): string | null {
    return this.featureService.isFeatureEnabled('DATA_UPLOAD')
      ? 'View & upload data'
      : null;
  }
}

const SUMMARY_PAGE_SIZE = 100;

/** "4 layers · 1 processing · 1 failed", or null when there are none. */
export function dataLayersSummary(
  page: Pagination<WorkspaceDataLayer>
): string | null {
  if (page.count === 0) {
    return null;
  }
  const processing = page.results.filter(
    (layer) => layer.status === 'PENDING' || layer.status === 'PROCESSING'
  ).length;
  const failed = page.results.filter(
    (layer) => layer.status === 'FAILED'
  ).length;
  return [
    `${page.count} ${page.count === 1 ? 'layer' : 'layers'}`,
    processing ? `${processing} processing` : '',
    failed ? `${failed} failed` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
