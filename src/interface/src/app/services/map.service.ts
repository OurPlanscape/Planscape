import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet.vectorgrid';
import { BehaviorSubject, EMPTY, Observable, of, take, tap } from 'rxjs';
import { SessionService } from '@services';
import {
  BoundaryConfig,
  ColormapConfig,
  ConditionsConfig,
  Region,
  regionToString,
} from '@types';
import { environment } from '../../environments/environment';

/** A map of Region to static assets for that region. */
const regionToGeojsonMap: Record<Region, Record<string, string>> = {
  [Region.SIERRA_NEVADA]: {
    boundary: 'assets/geojson/sierra_nevada_region.geojson',
  },
  [Region.CENTRAL_COAST]: {
    boundary: 'assets/geojson/central_coast_region.geojson',
  },
  [Region.NORTHERN_CALIFORNIA]: {
    boundary: 'assets/geojson/northern_california_region.geojson',
  },
  [Region.SOUTHERN_CALIFORNIA]: {
    boundary: 'assets/geojson/southern_california_region.geojson',
  },
};

@Injectable({
  providedIn: 'root',
})
export class MapService {
  readonly boundaryConfig$ = new BehaviorSubject<BoundaryConfig[] | null>(null);
  readonly conditionsConfig$ = new BehaviorSubject<ConditionsConfig | null>(
    null
  );
  readonly conditionNameToDisplayNameMap$ = new BehaviorSubject<
    Map<string, string>
  >(new Map<string, string>());

  readonly selectedRegion$ = this.sessionService.region$;

  private regionBoundaries: Partial<Record<Region, GeoJSON.GeoJSON>> = {};

  constructor(
    private http: HttpClient,
    private sessionService: SessionService
  ) {
    this.http
      .get<BoundaryConfig[]>(
        environment.backend_endpoint +
          '/boundary/config/?region_name=' +
          `${regionToString(this.selectedRegion$.getValue())}`
      )
      .pipe(take(1))
      .subscribe((config: BoundaryConfig[]) => {
        this.boundaryConfig$.next(config);
      });
    this.http
      .get<ConditionsConfig>(
        environment.backend_endpoint +
          '/conditions/config/?region_name=' +
          `${regionToString(this.selectedRegion$.getValue())}`
      )
      .pipe(take(1))
      .subscribe((config: ConditionsConfig) => {
        this.conditionsConfig$.next(config);
        this.populateConditionNameMap(config);
      });
  }

  /**
   * Gets the GeoJSON for the given region, or an empty observable
   * if the path is empty.
   * */
  getRegionBoundary(region: Region): Observable<GeoJSON.GeoJSON> {
    const path = regionToGeojsonMap[region];
    if (!path || !path['boundary']) return EMPTY;

    if (this.regionBoundaries[region]) {
      return of(this.regionBoundaries[region]!);
    }
    return this.http
      .get<GeoJSON.GeoJSON>(path['boundary'])
      .pipe(tap((data) => (this.regionBoundaries[region] = data)));
  }

  setConfigs() {
    this.http
      .get<BoundaryConfig[]>(
        environment.backend_endpoint +
          '/boundary/config/?region_name=' +
          `${regionToString(this.selectedRegion$.getValue())}`
      )
      .pipe(take(1))
      .subscribe((config: BoundaryConfig[]) => {
        this.boundaryConfig$.next(config);
      });
    this.http
      .get<ConditionsConfig>(
        environment.backend_endpoint +
          '/conditions/config/?region_name=' +
          `${regionToString(this.selectedRegion$.getValue())}`
      )
      .pipe(take(1))
      .subscribe((config: ConditionsConfig) => {
        this.conditionsConfig$.next(config);
        this.populateConditionNameMap(config);
      });
  }

  /** Get shapes for a boundary from assets, if possible.  Fall back to the
   *  REST server, clipping the shapes to the region if the region is non-null. */
  getBoundaryShapes(vectorName: string): Observable<L.Layer> {
    console.log('the vector name???', vectorName);
    var vector: Observable<L.Layer> = of(
      L.vectorGrid.protobuf(
        environment.tile_endpoint +
          'gwc/service/tms/1.0.0/' +
          `${vectorName}` +
          '@EPSG%3A3857@pbf/{z}/{x}/{-y}.pbf',
        {
          vectorTileLayerStyles: {
            [`${vectorName.split(':')[1]}`]: {
              // To set style value for every layer name (which is the value after '<region>:' in vectorName)
              weight: 1,
              fillOpacity: 0,
              color: '#0000ff',
              fill: true,
            },
          },
          interactive: true,
          zIndex: 1000, // To ensure boundary is loaded in on top of any other layers
          getFeatureId: function (f: any) {
            return f.properties.OBJECTID; // Every boundary feature must have a unique value OBJECTID in order to for hover info to properly work
          },
          maxZoom: 13,
        }
      )
    );

    return vector;
  }

  /** Get colormap values from the REST server. */
  getColormap(colormap: string): Observable<ColormapConfig> {
    return this.http.get<ColormapConfig>(
      environment.backend_endpoint.concat(
        `/conditions/colormap/?colormap=${colormap}`
      )
    );
  }

  private populateConditionNameMap(config: ConditionsConfig) {
    let nameMap = this.conditionNameToDisplayNameMap$.value;
    config.pillars?.forEach((pillar) => {
      if (!!pillar.pillar_name && !!pillar.display_name) {
        nameMap.set(pillar.pillar_name, pillar.display_name);
      }
      pillar.elements?.forEach((element) => {
        if (!!element.element_name && !!element.display_name) {
          nameMap.set(element.element_name, element.display_name);
        }
        element.metrics?.forEach((metric) => {
          if (!!metric.metric_name && !!metric.display_name) {
            nameMap.set(metric.metric_name, metric.display_name);
          }
        });
      });
    });
    this.conditionNameToDisplayNameMap$.next(nameMap);
  }
}
