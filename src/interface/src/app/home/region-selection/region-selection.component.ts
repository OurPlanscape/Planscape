import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { take } from 'rxjs';

import {
  AuthService,
  PlanService,
  SessionService,
  MapService,
} from '../../services';
import { RegionOption } from '../../types';
import { RegionService } from '../../services/region.service';
import { FeatureService } from '../../features/feature.service';

/**
 * The main region selection view component.
 */

@Component({
  selector: 'app-region-selection',
  templateUrl: './region-selection.component.html',
  styleUrls: ['./region-selection.component.scss'],
})
export class RegionSelectionComponent implements OnInit {
  hasPlans: boolean = false;
  loggedIn$ = this.authService.isLoggedIn$;
  readonly regionOptions = this.regions.regionOptions;

  /** We assume that Sierra Nevada is always enabled.  */
  multiple_regions_enabled =
    this.features.isFeatureEnabled('show_socal') ||
    this.features.isFeatureEnabled('show_centralcoast');

  constructor(
    private authService: AuthService,
    private planService: PlanService,
    private sessionService: SessionService,
    private mapService: MapService,
    private router: Router,
    private regions: RegionService,
    private features: FeatureService
  ) {}

  ngOnInit(): void {
    this.planService
      .listPlansByUser()
      .pipe(take(1))
      .subscribe((plans) => (this.hasPlans = plans.length !== 0));
  }

  /** Sets the region and navigates to the map. */
  setRegion(regionOption: RegionOption) {
    if (!regionOption.available) {
      return;
    }
    this.sessionService.setRegion(regionOption.type);
    this.mapService.setConfigs();
    this.router.navigateByUrl('/map');
  }
}
