import { Component, OnInit } from '@angular/core';
import { distinctUntilChanged, filter, take } from 'rxjs';
import { AuthService, WebSocketService } from '@services';
import { OverlayLoaderService } from '@services/overlay-loader.service';

import { environment } from '@env/environment';
import { ForsysService } from '@services/forsys.service';
import { MapModuleService } from '@services/map-module.service';
import { ProductAnalyticsService } from '@services/product-analytics.service';
import { WorkspaceDeletedListenerService } from '@app/workspaces/workspace-deleted-listener.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  sidebarOpen = false;

  readonly isCatalogEnvironment =
    (environment as typeof environment & { isCatalogEnvironment?: boolean })
      .isCatalogEnvironment ?? false;

  constructor(
    private authService: AuthService,
    private overlayLoaderService: OverlayLoaderService,
    private forsysService: ForsysService,
    private mapModuleService: MapModuleService,
    private productAnalyticsService: ProductAnalyticsService,
    private webSocketService: WebSocketService,
    private workspaceDeletedListener: WorkspaceDeletedListenerService
  ) {}

  isLoading$ = this.overlayLoaderService.isLoading$;

  toggleSidebar(event: Event) {
    this.sidebarOpen = !this.sidebarOpen;
  }

  ngOnInit(): void {
    // load initial forsys data
    this.forsysService.loadForsysData();
    // load map data
    this.mapModuleService.loadMapModule().subscribe();
    // Refresh the user's logged in status when the app initializes.
    this.authService.refreshLoggedInUser().pipe(take(1)).subscribe();
    this.productAnalyticsService.init();
    this.connectWebSocketWhileLoggedIn();
    this.workspaceDeletedListener.start();
  }

  private connectWebSocketWhileLoggedIn() {
    this.authService.isLoggedIn$
      .pipe(
        filter((loggedIn) => loggedIn !== null),
        distinctUntilChanged()
      )
      .subscribe((loggedIn) => {
        if (loggedIn) {
          this.webSocketService.connect();
        } else {
          this.webSocketService.disconnect();
        }
      });
  }
}
