import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { take } from 'rxjs';

import { AuthService, PlanService, SessionService, MapService } from '../../services';
import { RegionOption, regionOptions } from '../../types';
import features from '../../features/features.json'


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
  readonly regionOptions: RegionOption[] = regionOptions;

  /** We assume that Sierra Nevada is always enabled.  */
  multiple_regions_enabled = features.show_socal || features.show_centralcoast;
  constructor(
    private authService: AuthService,
    private planService: PlanService,
    private sessionService: SessionService,
    private mapService: MapService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    let user$ = this.authService.loggedInUser$;
    this.planService
      .listPlansByUser(user$.value?.username ? user$.value.username : null)
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
