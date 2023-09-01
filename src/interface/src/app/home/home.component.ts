import { Component, HostBinding } from '@angular/core';
import { AuthService } from '../services';
import { FeatureService } from '../features/feature.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  loggedIn$ = this.authService.loggedInStatus$;

  login_enabled = this.featuresService.isFeatureEnabled('login');
  constructor(
    private authService: AuthService,
    private featuresService: FeatureService
  ) {}

  @HostBinding('class.home') loggedInClasses: boolean =
    this.login_enabled || false;
}
