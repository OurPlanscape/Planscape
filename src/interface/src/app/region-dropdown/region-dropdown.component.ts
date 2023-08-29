import { Component } from '@angular/core';
import { Region, RegionOption, regionOptions } from '../types';
import { MapService, SessionService } from '../services';
import { Router } from '@angular/router';
import { FeatureService } from '../features/feature.service';

@Component({
  selector: 'app-region-dropdown',
  templateUrl: './region-dropdown.component.html',
  styleUrls: ['./region-dropdown.component.scss'],
})
export class RegionDropdownComponent {
  readonly regionOptions: RegionOption[] = regionOptions;
  readonly selectedRegion$ = this.sessionService.region$;

  newNavigation = this.featureService.isFeatureEnabled('new_navigation');

  constructor(
    private router: Router,
    private sessionService: SessionService,
    private mapService: MapService,
    private featureService: FeatureService
  ) {}

  /** Sets the region from the dropdown and goes to the map. */
  setRegion(event: Event) {
    // The built-in type for event is generic, so it needs to be cast
    const region = (event.target as HTMLSelectElement).value as Region;
    this.sessionService.setRegion(region);
    this.mapService.setConfigs();
  }
}
