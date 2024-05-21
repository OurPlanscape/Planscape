import { Injectable } from '@angular/core';
import { ConditionsConfig, Region, regionToString } from '@types';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MetricsService {
  // has a record of conditions for each region.
  // if no value on the record, go fetch.

  conditions: Record<Region, ConditionsConfig | null> = {
    [Region.CENTRAL_COAST]: null,
    [Region.NORTHERN_CALIFORNIA]: null,
    [Region.SIERRA_NEVADA]: null,
    [Region.SOUTHERN_CALIFORNIA]: null,
  };

  constructor(private http: HttpClient) {}

  public getMetricsForRegion(region: Region) {
    if (this.conditions[region] !== null) {
      return of(this.conditions[region] as ConditionsConfig);
    }
    return this.http
      .get<ConditionsConfig>(
        environment.backend_endpoint +
          '/conditions/config/?region_name=' +
          `${regionToString(region)}`
      )
      .pipe(
        tap((conditionsConfig) => (this.conditions[region] = conditionsConfig))
      );
  }
}
