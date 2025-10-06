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

  readonly COLORS = BASE_COLORS;
  readonly sourceName = MARTIN_SOURCES.scenarioStands.sources.stands;
  readonly excludedKey = 'excluded';
  readonly constrainedKey = 'constrained';
  readonly planId = this.route.snapshot.data['planId'];

  private standsLoaded = false;

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
      this.standsLoaded = false;
    })
  );

  opacity$ = this.mapConfigState.opacity$;

  // local copies to reset feature state
  private excludedStands: number[] = [];
  private constrainedStands: number[] = [];

  constructor(
    private route: ActivatedRoute,
    private newScenarioState: NewScenarioState,
    private zone: NgZone,
    private mapConfigState: MapConfigState
  ) {
    // remove constrainedStands when going back to step 1
    this.step$
      .pipe(
        untilDestroyed(this),
        filter((step) => step === 1)
      )
      .subscribe((step) => {
        this.constrainedStands.forEach((id) =>
          this.removeFeatureState(id, this.constrainedKey)
        );
      });

    this.newScenarioState.doesNotMeetConstraintsStands$
      .pipe(untilDestroyed(this))
      .subscribe((ids) => {
        this.constrainedStands.forEach((id) =>
          this.removeFeatureState(id, this.constrainedKey)
        );
        ids.forEach((id) => this.setFeatureState(id, this.constrainedKey));

        this.constrainedStands = ids;
      });

    this.newScenarioState.excludedStands$
      .pipe(untilDestroyed(this))
      .subscribe((ids) => {
        this.excludedStands.forEach((id) =>
          this.removeFeatureState(id, this.excludedKey)
        );
        ids.forEach((id) => this.setFeatureState(id, this.excludedKey));
        this.excludedStands = ids;
      });
  }

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
    map((opacity) => {
      const hidden = [
        'any',
        ['boolean', ['feature-state', this.excludedKey], false],
        ['boolean', ['feature-state', this.constrainedKey], false],
      ] as const;

      return {
        'fill-opacity-transition': { duration: 0 },
        'fill-color': [
          'case',
          hidden,
          'transparent', // if excluded OR constrained
          BASE_COLORS.dark_magenta, // otherwise
        ],
        'fill-opacity': opacity,
      } as any;
    })
  );

  standLinePaint$ = this.opacity$.pipe(
    map(
      (opacity) =>
        ({
          'line-width': 1,
          'line-color': this.featureStatePaint(
            BASE_COLORS.dark,
            BASE_COLORS.dark_magenta,
            this.excludedKey
          ),
          'line-opacity': opacity,
          'line-opacity-transition': { duration: 0 },
        }) as any
    )
  );

  standExcludedPaint$ = this.opacity$.pipe(
    map(
      (opacity) =>
        ({
          'fill-opacity-transition': { duration: 0 },
          'fill-pattern': 'exclude-pattern', // constant pattern
          'fill-opacity': this.featureStatePaint(opacity, 0, this.excludedKey),
        }) as any
    )
  );

  standThresholdPaint$ = this.opacity$.pipe(
    map(
      (opacity) =>
        ({
          'fill-opacity-transition': { duration: 0 },
          'fill-pattern': 'thresholds-pattern', // constant pattern
          'fill-opacity': this.featureStatePaint(
            opacity,
            0,
            this.constrainedKey
          ),
        }) as any
    )
  );

  step$ = this.newScenarioState.stepIndex$;

  showThresholdStands$ = this.step$.pipe(map((s) => s > 1));

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
      !event.sourceDataType &&
      !this.standsLoaded
    ) {
      this.zone.run(() => {
        this.newScenarioState.setBaseStandsLoaded(true);
        this.newScenarioState.setLoading(false);
        this.standsLoaded = true;
      });
    }
  };

  private setFeatureState(id: number, key: string) {
    this.mapLibreMap.setFeatureState(
      {
        source: this.sourceName,
        sourceLayer: this.sourceName,
        id: id,
      },
      { [key]: true }
    );
  }

  private removeFeatureState(id: number, key: string) {
    this.mapLibreMap.removeFeatureState(
      {
        source: this.sourceName,
        sourceLayer: this.sourceName,
        id: id,
      },
      key
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
