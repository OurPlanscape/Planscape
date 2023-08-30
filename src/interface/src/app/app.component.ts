import { Component, OnInit } from '@angular/core';
import { take } from 'rxjs';

import { AuthService } from './services';
import { FeatureService } from './features/feature.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  sidebarOpen = false;

  hasNewNavigation = this.featureService.isFeatureEnabled('new_navigation');
  constructor(
    private authService: AuthService,
    private featureService: FeatureService
  ) {}

  toggleSidebar(event: Event) {
    this.sidebarOpen = !this.sidebarOpen;
  }

  ngOnInit(): void {
    // Refresh the user's logged in status when the app initializes.
    this.authService.refreshLoggedInUser().pipe(take(1)).subscribe();
  }
}
