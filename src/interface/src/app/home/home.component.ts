import { Component, HostBinding } from '@angular/core';
import { AuthService } from '@services';
import { FeatureService } from '../features/feature.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { filter } from 'rxjs/operators';
import { NavigationStart, Router } from '@angular/router';

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
    private router: Router
  ) {
    this.router.events
      .pipe(
        untilDestroyed(this),
        filter(
          (event): event is NavigationStart => event instanceof NavigationStart
        )
      )
      .subscribe((event: NavigationStart) => {
        if (event.url === '/home') {
          //reset parameters
          this.showPlanningAreas = false;
          setTimeout(() => {
            this.showPlanningAreas = true;
          }, 0);
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
