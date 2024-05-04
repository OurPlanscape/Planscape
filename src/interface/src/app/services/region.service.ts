import { Injectable } from '@angular/core';
import { FeatureService } from '../features/feature.service';
import { Region, RegionOption, regions } from '@types';
import { SessionService } from './session.service';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RegionService {
  constructor(
    private features: FeatureService,
    private sessionService: SessionService
  ) {}

  private availableRegions = new Set([
    Region.SIERRA_NEVADA,
    this.features.isFeatureEnabled('show_socal')
      ? Region.SOUTHERN_CALIFORNIA
      : null,
    this.features.isFeatureEnabled('show_centralcoast')
      ? Region.CENTRAL_COAST
      : null,
    this.features.isFeatureEnabled('show_north_cal')
      ? Region.NORTHERN_CALIFORNIA
      : null,
  ]);

  regionOptions: RegionOption[] = regions.map((region) => {
    return {
      type: region,
      name: region,
      available: this.availableRegions.has(region),
    };
  });

  private regionDrawOptions: Record<Region, boolean> = {
    [Region.SIERRA_NEVADA]: true,
    [Region.SOUTHERN_CALIFORNIA]: this.features.isFeatureEnabled('draw_socal'),
    [Region.NORTHERN_CALIFORNIA]:
      this.features.isFeatureEnabled('draw_northcal'),
    [Region.CENTRAL_COAST]: this.features.isFeatureEnabled('draw_centralcoast'),
  };

  drawRegionEnabled$ = this.sessionService.region$
    .asObservable()
    .pipe(map((region) => (region ? this.regionDrawOptions[region] : false)));
}
