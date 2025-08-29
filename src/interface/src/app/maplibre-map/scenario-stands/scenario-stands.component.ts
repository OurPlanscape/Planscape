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

  constructor(
    private route: ActivatedRoute,
    private newScenarioState: NewScenarioState,
    private zone: NgZone
  ) {
    this.newScenarioState.excludedStands.subscribe((s) =>
      s.forEach((id) => this.markStandAsExcluded(id))
    );
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
      { excluded: true }
    );
  }

  standPaint = {
    'fill-outline-color': 'transparent',
    'fill-color': [
      'case',
      ['boolean', ['feature-state', 'excluded'], false],
      BASE_COLORS.dark,
      BASE_COLORS.dark_magenta,
    ],
    'fill-opacity': 0.2,
  } as any;

  standLinePaint = {
    'line-width': 1,
    'line-color': BASE_COLORS.dark_magenta,
    'line-opacity': [
      'case',
      ['boolean', ['feature-state', 'excluded'], false],
      0.2,
      1,
    ],
  } as any;

  standExcludedPaint = {
    'fill-pattern': 'stripes-pattern', // constant pattern
    'fill-opacity': [
      'case',
      ['boolean', ['feature-state', 'excluded'], false],
      1, // show pattern
      0, // hide pattern
    ],
  } as any;
}
