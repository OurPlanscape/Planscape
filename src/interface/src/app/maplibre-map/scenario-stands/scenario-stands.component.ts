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
import { combineLatest, map, Observable, tap } from 'rxjs';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import { FilterSpecification, Map as MapLibreMap } from 'maplibre-gl';
import { NewScenarioState } from '../../scenario/new-scenario.state';
import { MapConfigState } from '../map-config.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
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
  constrainedStands: number[] = [];

  readonly excludedKey = 'excluded';
  readonly constrainedKey = 'constrained';

  constructor(
    private route: ActivatedRoute,
    private newScenarioState: NewScenarioState,
    private zone: NgZone,
    private mapConfigState: MapConfigState
  ) {
    this.newScenarioState.excludedStands$
      .pipe(untilDestroyed(this))
      .subscribe((ids) => {
        const toRemove = this.excludedStands.filter((id) => !ids.includes(id));
        const toAdd = ids.filter((id) => !this.excludedStands.includes(id));

        toRemove.forEach((id) => this.removeMarkStandAsExcluded(id));
        toAdd.forEach((id) => this.markStandAsExcluded(id));

        this.excludedStands = ids;
      });

    this.newScenarioState.doesNotMeetConstraintsStands$
      .pipe(untilDestroyed(this))
      .subscribe((ids) => {
        const toRemove = this.constrainedStands.filter(
          (id) => !ids.includes(id)
        );
        const toAdd = ids.filter((id) => !this.constrainedStands.includes(id));

        toRemove.forEach((id) => this.removeMarkStandAsConstrained(id));
        toAdd.forEach((id) => this.markStandAsConstrained(id));

        this.constrainedStands = ids;
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
      event.type === 'sourcedata' &&
      !event.sourceDataType
    ) {
      this.zone.run(() => {
        this.newScenarioState.setBaseStandsLoaded(true);
        this.newScenarioState.setLoading(false);
      });
    }
  };

  opacity$ = this.mapConfigState.projectAreasOpacity$;

  filteredStands$: Observable<FilterSpecification | undefined> = combineLatest([
    this.newScenarioState.stepIndex$,
    this.newScenarioState.excludedStands$,
  ]).pipe(
    map(([step, excluded]): FilterSpecification | undefined =>
      step > 1 && excluded.length
        ? ['!', ['in', ['get', 'id'], ['literal', excluded]]]
        : undefined
    )
  );

  standPaint$ = this.opacity$.pipe(
    map(
      (opacity) =>
        ({
          'fill-color': this.featureStatePaint(
            BASE_COLORS.black,
            BASE_COLORS.dark_magenta,
            this.excludedKey
          ),
          'fill-opacity': this.featureStatePaint(
            opacity,
            opacity,
            this.excludedKey
          ),
        }) as any
    )
  );

  standLinePaint = {
    'line-width': 1,
    'line-color': BASE_COLORS.dark_magenta,
    'line-opacity': this.featureStatePaint(0.2, 1, this.excludedKey),
  } as any;

  standExcludedPaint = {
    'fill-pattern': 'stripes-pattern', // constant pattern
    'fill-opacity': this.featureStatePaint(1, 0, this.excludedKey),
  } as any;

  standConstrainedPaint = {
    'fill-pattern': 'stripes-pattern', // constant pattern
    'fill-opacity': this.featureStatePaint(1, 0, this.constrainedKey),
  } as any;

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

  private markStandAsConstrained(id: number) {
    this.mapLibreMap.setFeatureState(
      {
        source: this.sourceName,
        sourceLayer: this.sourceName,
        id: id,
      },
      { [this.constrainedKey]: true }
    );
  }

  private removeMarkStandAsConstrained(id: number) {
    this.mapLibreMap.removeFeatureState(
      {
        source: this.sourceName,
        sourceLayer: this.sourceName,
        id: id,
      },
      this.constrainedKey
    );
  }

  private featureStatePaint(
    valueOn: number | string,
    valueOff: number | string,
    key: string
  ) {
    return [
      'case',
      ['boolean', ['feature-state', key], false],
      valueOn,
      valueOff,
    ];
  }
}
