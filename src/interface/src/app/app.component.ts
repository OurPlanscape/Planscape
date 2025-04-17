import { Component, OnInit } from '@angular/core';
import { take } from 'rxjs';
import { AuthService } from '@services';
import { OverlayLoaderService } from '@services/overlay-loader.service';

import { environment } from '../environments/environment';
import { OpenPanel } from '@openpanel/web';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  sidebarOpen = false;

  constructor(
    private authService: AuthService,
    private overlayLoaderService: OverlayLoaderService
  ) {}

  isLoading$ = this.overlayLoaderService.isLoading$;

  toggleSidebar(event: Event) {
    this.sidebarOpen = !this.sidebarOpen;
  }

  ngOnInit(): void {
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
