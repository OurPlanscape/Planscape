import { Injectable } from '@angular/core';
import { MetricConfig, Region, regionToString } from '@types';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MetricsService {
  /**
   * Stores a record of metrics for each region.
   */
  private conditions: Record<Region, MetricConfig[] | null> = {
    [Region.CENTRAL_COAST]: null,
    [Region.NORTHERN_CALIFORNIA]: null,
    [Region.SIERRA_NEVADA]: null,
    [Region.SOUTHERN_CALIFORNIA]: null,
  };

  constructor(private http: HttpClient) {}

  /**
   * Gets a flat list of metrics for a given region.
   * Only fetches the metrics if we dont have a record already
   * @param region
   */
  public getMetricsForRegion(region: Region) {
    if (this.conditions[region] !== null) {
      return of(this.conditions[region] as MetricConfig[]);
    }
    return this.http
      .get<
        MetricConfig[]
      >(environment.backend_endpoint + '/conditions/config/?flat=true&region_name=' + `${regionToString(region)}`)
      .pipe(
        tap((conditionsConfig) => (this.conditions[region] = conditionsConfig))
      );
  }
}
