import { Component, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { BASE_COLORS } from '../../treatments/map.styles';
import { AsyncPipe, NgIf } from '@angular/common';
import {
  ImageComponent,
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { ActivatedRoute } from '@angular/router';
import { MARTIN_SOURCES } from '../../treatments/map.sources';
import { map, tap } from 'rxjs';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import { Map as MapLibreMap } from 'maplibre-gl';
import { NewScenarioState } from '../../scenario/new-scenario.state';

@Component({
  selector: 'app-scenario-stands',
  standalone: true,
  imports: [
    AsyncPipe,
    LayerComponent,
    NgIf,
    VectorSourceComponent,
    ImageComponent,
  ],
  templateUrl: './scenario-stands.component.html',
})
export class ScenarioStandsComponent implements OnInit, OnDestroy {
  @Input() mapLibreMap!: MapLibreMap;

  protected readonly COLORS = BASE_COLORS;
  sourceName = MARTIN_SOURCES.scenarioStands.sources.stands;

  planId = this.route.snapshot.data['planId'];

  tilesUrl$ = this.newScenarioState.scenarioConfig$.pipe(
    filter((config) => !!config.stand_size),
    map(
      (config) =>
        MARTIN_SOURCES.scenarioStands.tilesUrl +
        `?planning_area_id=${this.planId}&stand_size=${config.stand_size}`
    ),
    distinctUntilChanged(),
    tap((s) => {
      this.newScenarioState.setLoading(true);
    })
  );

  // local copy to reset feature state
  excludedStands: number[] = [];
  readonly excludedKey = 'excluded';

  constructor(
    private route: ActivatedRoute,
    private newScenarioState: NewScenarioState,
    private zone: NgZone
  ) {
    this.newScenarioState.excludedStands.subscribe((ids) => {
      const toRemove = this.excludedStands.filter((id) => !ids.includes(id));
      const toAdd = ids.filter((id) => !this.excludedStands.includes(id));

      toRemove.forEach((id) => this.removeMarkStandAsExcluded(id));
      toAdd.forEach((id) => this.markStandAsExcluded(id));

      this.excludedStands = ids;
    });
  }

  ngOnInit(): void {
    this.mapLibreMap.on('sourcedata', this.onDataListener);
  }

  ngOnDestroy(): void {
    this.mapLibreMap.off('sourcedata', this.onDataListener);
  }

  private onDataListener = (event: any) => {
    if (
      event.sourceId === this.sourceName &&
      event.isSourceLoaded &&
      !event.sourceDataType
    ) {
      this.zone.run(() => {
        this.newScenarioState.setLoading(false);
      });
    }
  };

  private markStandAsExcluded(id: number) {
    this.mapLibreMap.setFeatureState(
      {
        source: this.sourceName,
        sourceLayer: this.sourceName,
        id: id,
      },
      { [this.excludedKey]: true }
    );
  }

  private removeMarkStandAsExcluded(id: number) {
    this.mapLibreMap.removeFeatureState(
      {
        source: this.sourceName,
        sourceLayer: this.sourceName,
        id: id,
      },
      this.excludedKey
    );
  }

  standPaint = {
    'fill-color': [
      'case',
      ['boolean', ['feature-state', 'excluded'], false],
      BASE_COLORS.black,
      BASE_COLORS.dark_magenta,
    ],
    'fill-opacity': this.featureStatePaint(0.3, 0.1),
  } as any;

  standLinePaint = {
    'line-width': 1,
    'line-color': BASE_COLORS.dark_magenta,
    'line-opacity': this.featureStatePaint(0.2, 1),
  } as any;

  standExcludedPaint = {
    'fill-pattern': 'stripes-pattern', // constant pattern
    'fill-opacity': this.featureStatePaint(1, 0),
  } as any;

  private featureStatePaint(valueOn: number, valueOff: number) {
    return [
      'case',
      ['boolean', ['feature-state', this.excludedKey], false],
      valueOn,
      valueOff,
    ];
  }
}
