import { Component, OnInit } from '@angular/core';
import { take } from 'rxjs';
import { AuthService } from '@services';
import { OverlayLoaderService } from '@services/overlay-loader.service';

import { environment } from '@env/environment';
import { ForsysService } from '@services/forsys.service';
import { MapModuleService } from '@services/map-module.service';
import { MixpanelService } from '@services/mixpanel.service';
import { OpenPanelService } from '@services/open-panel.service';

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
    private mixpanelService: MixpanelService,
    private openPanelService: OpenPanelService
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
    // We're migrating from OpenPanel to Mixpanel, so both run side by side
    // while the historical data is backfilled. See scripts/openpanel_to_mixpanel.
    this.openPanelService.init();
    this.mixpanelService.init();
  }
}
