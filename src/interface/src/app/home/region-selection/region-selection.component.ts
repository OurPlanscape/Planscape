import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { take } from 'rxjs';

import { AuthService, PlanService, SessionService } from '../../services';
import { RegionOption, regionOptions } from '../../types';

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
  readonly regionOptions: RegionOption[] = regionOptions;

  constructor(
    private authService: AuthService,
    private planService: PlanService,
    private sessionService: SessionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    let user$ = this.authService.loggedInUser$;
    this.planService
      .listPlansByUser(user$.value ? user$.value.username : null)
      .pipe(take(1))
      .subscribe((plans) => (this.hasPlans = plans.length !== 0));
  }

  /** Sets the region and navigates to the map. */
  setRegion(regionOption: RegionOption) {
    if (!regionOption.available) {
      return;
    }
    this.sessionService.setRegion(regionOption.type);
    this.router.navigateByUrl('/map');
  }
}
