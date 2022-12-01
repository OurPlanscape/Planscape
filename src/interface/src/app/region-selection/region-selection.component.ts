import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { RegionOption, regionOptions } from '../types';
import { SessionService } from '../services';

/**
 * The main region selection view component.
 */

@Component({
  selector: 'app-region-selection',
  templateUrl: './region-selection.component.html',
  styleUrls: ['./region-selection.component.scss']
})
export class RegionSelectionComponent implements OnInit {
  selectedRegion$ = this.sessionService.region$;
  readonly regionOptions: RegionOption[] = regionOptions;

  constructor(
    private sessionService: SessionService,
    private router: Router,
  ) {}

  ngOnInit(): void {}

  /** Sets the region and navigates to the map. */
  setRegion(regionOption: RegionOption) {
    if (!regionOption.available) {
      return;
    }
    this.sessionService.setRegion(regionOption.type);
    this.router.navigateByUrl('/map');
  }

}
