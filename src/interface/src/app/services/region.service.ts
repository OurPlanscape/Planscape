import { Injectable } from '@angular/core';
import { FeatureService } from '../features/feature.service';
import { Region, RegionOption, regions } from '../types';

@Injectable({
  providedIn: 'root',
})
export class RegionService {
  constructor(private features: FeatureService) {}

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
}
