import { Component, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { BASE_COLORS } from '../../treatments/map.styles';
import { AsyncPipe, NgIf } from '@angular/common';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { ActivatedRoute } from '@angular/router';
import { MARTIN_SOURCES } from '../../treatments/map.sources';
import {
  animationFrameScheduler,
  auditTime,
  combineLatest,
  concat,
  map,
  Observable,
  observeOn,
  of,
  tap,
} from 'rxjs';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import { FilterSpecification, Map as MapLibreMap } from 'maplibre-gl';
import { NewScenarioState } from 'src/app/scenario-creation/new-scenario.state';
import { MapConfigState } from '../map-config.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FrontendConstants } from '../../map/map.constants';

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
    // remove constrainedStands in not included on the step.
    this.step$
      .pipe(
        untilDestroyed(this),
        filter(
          (step) => !this.newScenarioState.includeConstraintsInCurrentStep(step)
        )
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
      // if we are showing both excluded and constraints, filter out the excluded stands on the map.
      this.newScenarioState.includeExcludedAreasInCurrentStep(step) &&
      this.newScenarioState.includeConstraintsInCurrentStep(step) &&
      excluded.length
        ? ['!', ['in', ['get', 'id'], ['literal', excluded]]]
        : undefined
    )
  );

  // using this concat so we can keep things inside angular lifecycle without adding zone.runs or detectChanges
  standPaint$ = concat(
    of(FrontendConstants.MAPLIBRE_MAP_DATA_LAYER_OPACITY), // <-- emit immediately so the layer renders
    this.opacity$.pipe(
      // use  animationFrameScheduler (similar to requestAnimationFrame)
      observeOn(animationFrameScheduler),
      // collapse multiple slider events to one per frame
      auditTime(0)
    )
  ).pipe(
    map((opacity) => {
      return {
        'fill-color': [
          'case',
          ['==', ['feature-state', this.excludedKey], true],
          BASE_COLORS.dark_gray,
          ['==', ['feature-state', this.constrainedKey], true],
          BASE_COLORS.light_gray,
          BASE_COLORS.dark_magenta, // otherwise
        ],
        'fill-opacity-transition': { duration: 0 },

        'fill-outline-color': [
          'case',
          ['==', ['feature-state', this.excludedKey], true],
          BASE_COLORS.dark_gray,
          ['==', ['feature-state', this.constrainedKey], true],
          BASE_COLORS.light_gray,
          BASE_COLORS.darker_magenta, // otherwise
        ],
        'fill-opacity': opacity,
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
