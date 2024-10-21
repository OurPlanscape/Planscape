import { Component, Input } from '@angular/core';
import { Region } from '@types';
import { MapService, SessionService } from '@services';

@Component({
  selector: 'app-region-dropdown',
  templateUrl: './region-dropdown.component.html',
  styleUrls: ['./region-dropdown.component.scss'],
})
export class RegionDropdownComponent {
  readonly regions = Object.entries(Region).map(([key, region]) => ({
    key,
    region: region as Region,
  }));
  readonly selectedRegion$ = this.sessionService.region$;
  @Input() disabled = false;

  constructor(
    private sessionService: SessionService,
    private mapService: MapService
  ) {}

  /** Sets the region from the dropdown and goes to the map. */
  setRegion(event: Event) {
    // The built-in type for event is generic, so it needs to be cast
    const region = (event.target as HTMLSelectElement).value as Region;
    this.sessionService.setRegion(region);
    this.mapService.setConfigs();
  }
}
