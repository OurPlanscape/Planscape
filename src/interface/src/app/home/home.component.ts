import { ChangeDetectorRef, Component, HostBinding } from '@angular/core';
import { AuthService } from '@services';
import { FeatureService } from '../features/feature.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { filter } from 'rxjs/operators';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

@UntilDestroy()
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  loggedIn$ = this.authService.loggedInStatus$;
  showPlanningAreas = true;

  constructor(
    private authService: AuthService,
    private featureService: FeatureService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.router.events
      .pipe(
        untilDestroyed(this),
        filter(
          (event) =>
            event instanceof NavigationStart || event instanceof NavigationEnd
        )
      )
      .subscribe((event) => {
        if (event instanceof NavigationStart && event.url === '/home') {
          // Navigation starts: Hide the component
          this.showPlanningAreas = false;
          this.cdr.detectChanges(); // Trigger view update to ensure the component is hidden
        }

        if (event instanceof NavigationEnd && event.url === '/home') {
          // Navigation ends: Re-show the component
          this.showPlanningAreas = true;
          this.cdr.detectChanges(); // Trigger view update to ensure the component is shown
        }
      });
  }

  get hasNewHome() {
    return this.featureService.isFeatureEnabled('new_home');
  }

  @HostBinding('class.with-background')
  get showImageBackground() {
    return this.loggedIn$.value && !this.hasNewHome;
  }
}
