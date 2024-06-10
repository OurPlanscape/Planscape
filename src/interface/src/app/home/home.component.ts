import { Component, HostBinding } from '@angular/core';
import { AuthService } from '@services';
import { FeatureService } from '../features/feature.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  loggedIn$ = this.authService.loggedInStatus$;

  constructor(
    private authService: AuthService,
    private featureService: FeatureService
  ) {}

  get hasNewHome() {
    return this.featureService.isFeatureEnabled('new_home');
  }

  @HostBinding('class.with-background')
  get showImageBackground() {
    return this.loggedIn$.value && !this.hasNewHome;
  }
}
