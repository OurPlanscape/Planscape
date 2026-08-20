import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { CardLinkComponent, OverlayLoaderComponent } from '@styleguide';
import { DashboardLayoutComponent } from '@styleguide/dashboard-layout/dashboard-layout.component';
import { DetailsCardComponent } from '@styleguide/details-card/details-card.component';
import { WorkspaceState } from '../workspace.state';
import { AsyncPipe, NgIf } from '@angular/common';
import { ResourceUnavailableComponent } from '@app/shared/resource-unavailable/resource-unavailable.component';

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
  ],
  templateUrl: './workspace-dashboard.component.html',
  providers: [MapConfigService],

  styleUrl: './workspace-dashboard.component.scss',
})
export class WorkspaceDashboardComponent implements OnInit {
  private breadcrumbService = inject(BreadcrumbService);
  private route = inject(ActivatedRoute);
  private workspaceState = inject(WorkspaceState);

  workspaceId = this.route.snapshot.data['workspaceId'];

  currentWorkspace$ = this.workspaceState.currentWorkspace$;

  isWorkspaceLoading$ = this.workspaceState.isWorkspaceLoading$;

  workspaceNotFound$ = this.workspaceState.workspaceNotFound$;

  ngOnInit(): void {
    this.breadcrumbService.updateBreadCrumb({
      label: 'Home ',
      backUrl: 'home',
    });
  }
}
