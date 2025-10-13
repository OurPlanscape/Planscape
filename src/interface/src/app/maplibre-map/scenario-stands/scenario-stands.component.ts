import { Component, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { BASE_COLORS } from '../../treatments/map.styles';
import { AsyncPipe, NgIf } from '@angular/common';
import {
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
  imports: [AsyncPipe, LayerComponent, NgIf, VectorSourceComponent],
  templateUrl: './scenario-stands.component.html',
})
export class ScenarioStandsComponent implements OnInit, OnDestroy {
  @Input() mapLibreMap!: MapLibreMap;
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
    // when the stand size changes, set as loading
    tap((s) => {
      this.newScenarioState.setLoading(true);
      this.standsLoaded = false;
    })
  );

  opacity$ = this.mapConfigState.opacity$;
  step$ = this.newScenarioState.stepIndex$;

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
        this.paintConstrainedStands(ids);
      });

    this.newScenarioState.excludedStands$
      .pipe(untilDestroyed(this))
      .subscribe((ids) => {
        this.paintExcludedStands(ids);
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
        'fill-color': [
          'case',
          ['==', ['feature-state', this.excludedKey], true],
          BASE_COLORS.dark_gray,
          ['==', ['feature-state', this.constrainedKey], true],
          BASE_COLORS.light_gray,
          BASE_COLORS.dark_magenta, // otherwise
        ],

        'fill-outline-color': [
          'case',
          ['==', ['feature-state', this.excludedKey], true],
          BASE_COLORS.dark_gray,
          ['==', ['feature-state', this.constrainedKey], true],
          BASE_COLORS.light_gray,
          BASE_COLORS.darker_magenta, // otherwise
        ],
        'fill-opacity': [
          'case',
          hidden,
          opacity * 0.6,
          opacity * 0.9, // otherwise
        ],
      } as any;
    })
  );

  ngOnInit(): void {
    this.mapLibreMap.on('sourcedata', this.onDataListener);
    this.mapLibreMap.on('styledata', this.onStyleDataListener);
  }

  ngOnDestroy(): void {
    this.mapLibreMap.off('sourcedata', this.onDataListener);
    this.mapLibreMap.off('styledata', this.onStyleDataListener);
  }

  private paintExcludedStands(ids: number[]) {
    this.excludedStands.forEach((id) =>
      this.removeFeatureState(id, this.excludedKey)
    );
    ids.forEach((id) => this.setFeatureState(id, this.excludedKey));
    this.excludedStands = ids;
  }

  private paintConstrainedStands(ids: number[]) {
    this.constrainedStands.forEach((id) =>
      this.removeFeatureState(id, this.constrainedKey)
    );
    ids.forEach((id) => this.setFeatureState(id, this.constrainedKey));
    this.constrainedStands = ids;
  }

  private onStyleDataListener = (e: Event) => {
    this.paintExcludedStands(this.excludedStands);
    this.paintConstrainedStands(this.constrainedStands);
  };

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
}
