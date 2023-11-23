import { Component } from '@angular/core';
import { FeatureService } from '../../features/feature.service';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss'],
})
export class WelcomeComponent {
  showsNorthCal = this.features.isFeatureEnabled('show_north_cal');

  constructor(private features: FeatureService) {}
}
