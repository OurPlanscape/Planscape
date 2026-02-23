import { Component, OnInit } from '@angular/core';
import { take } from 'rxjs';
import { AuthService } from '@services';
import { OverlayLoaderService } from '@services/overlay-loader.service';

import { environment } from '@env/environment';
import { OpenPanel } from '@openpanel/web';
import { ForsysService } from '@services/forsys.service';
import { MapModuleService } from '@services/map-module.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  sidebarOpen = false;

  constructor(
    private authService: AuthService,
    private overlayLoaderService: OverlayLoaderService,
    private forsysService: ForsysService,
    private mapModuleService: MapModuleService
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
    if (environment.open_panel_enabled) {
      new OpenPanel({
        apiUrl: 'https://op.sig-gis.com/api',
        clientId: environment.open_panel_key,
        trackScreenViews: true,
        trackOutgoingLinks: true,
        trackAttributes: true,
      });
    }
  }
}
