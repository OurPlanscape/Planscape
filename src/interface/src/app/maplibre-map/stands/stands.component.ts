import { AfterViewInit, Component, Input, NgZone, OnInit } from '@angular/core';
import { BASE_COLORS } from '@treatments/map.styles';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { ActivatedRoute } from '@angular/router';
import { MARTIN_SOURCES } from '@treatments/map.sources';
import {
  animationFrameScheduler,
  auditTime,
  combineLatest,
  concat,
  fromEvent,
  map,
  Observable,
  observeOn,
  of,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import {
  FilterSpecification,
  Map as MapLibreMap,
  MapSourceDataEvent,
} from 'maplibre-gl';
import { NewScenarioState } from '@scenario-creation/new-scenario.state';
import { MapConfigState } from '../map-config.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FrontendConstants } from '@map/map.constants';

/**
  reacts internally to currentStep$ (the single source of truth) to determine the sourceName/tilesUrl.
 */
@UntilDestroy()
@Component({
  selector: 'app-stands',
  standalone: true,
  imports: [AsyncPipe, LayerComponent, NgIf, VectorSourceComponent, NgFor],
  templateUrl: './stands.component.html',
})
export class StandsComponent implements OnInit, AfterViewInit {
  @Input() mapLibreMap!: MapLibreMap;

  /**
   * Set true when these stands live under a parent plan / project area.
   * Leave false (default) for the standalone scenario
   */
  @Input() hasParent = false;

  readonly excludedKey = 'excluded';
  readonly constrainedKey = 'constrained';
  readonly scenarioId = this.route.snapshot.data['scenarioId'];

  private standsLoaded = false;
  private excludedStands: number[] = [];
  private constrainedStands: number[] = [];

  /** true when the current step corresponds to the "with includes" flow */
  useIncludes$ = this.newScenarioState.currentStep$.pipe(
    map((step) => !!step?.withIncludes),
    distinctUntilChanged()
  );

  /** name of the martin source for the current flow */
  sourceName$ = this.useIncludes$.pipe(
    map((useIncludes) => this.getSourceName(useIncludes))
  );

  opacity$ = this.mapConfigState.opacity$;

  tilesUrl$!: Observable<string>;

  private getSourceName(useIncludes: boolean): string {
    if (useIncludes) {
      return this.hasParent
        ? MARTIN_SOURCES.treatableStandsByProjectAreas.sources.stands
        : MARTIN_SOURCES.scenarioStands.sources.standsWithIncludes;
    }
    return this.hasParent
      ? MARTIN_SOURCES.standsByProjectAreas.sources.stands
      : MARTIN_SOURCES.scenarioStands.sources.stands;
  }

  constructor(
    private route: ActivatedRoute,
    private newScenarioState: NewScenarioState,
    private zone: NgZone,
    private mapConfigState: MapConfigState
  ) {}

  filteredStands$: Observable<FilterSpecification | undefined> = combineLatest([
    this.newScenarioState.currentStep$,
    this.newScenarioState.excludedStands$,
  ]).pipe(
    map(([step, excluded]): FilterSpecification | undefined =>
      // if we are showing both excluded and constraints, filter out the excluded stands on the map.
      step?.includeExcludedAreas && step?.includeConstraints && excluded.length
        ? ['!', ['in', ['get', 'id'], ['literal', excluded]]]
        : undefined
    )
  );

  // using this concat so we can keep things inside angular lifecycle without adding zone.runs or detectChanges
  standPaint$ = concat(
    of(FrontendConstants.MAPLIBRE_MAP_DATA_LAYER_OPACITY), // <-- emit immediately so the layer renders
    this.opacity$.pipe(observeOn(animationFrameScheduler), auditTime(0))
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
    this.tilesUrl$ = this.buildTilesUrl$();

    fromEvent<MapSourceDataEvent>(this.mapLibreMap, 'sourcedata')
      .pipe(withLatestFrom(this.sourceName$), untilDestroyed(this))
      .subscribe(([event, sourceName]) =>
        this.onDataListener(event, sourceName)
      );

    fromEvent(this.mapLibreMap, 'styledata')
      .pipe(withLatestFrom(this.sourceName$), untilDestroyed(this))
      .subscribe(([, sourceName]) => this.onStyleDataListener(sourceName));

    // clear constrained stands when navigating to a step that doesn't include constraints (or pre-step).
    this.newScenarioState.currentStep$
      .pipe(
        untilDestroyed(this),
        filter((step) => step === null || !step.includeConstraints),
        withLatestFrom(this.sourceName$)
      )
      .subscribe(([, sourceName]) => {
        this.constrainedStands.forEach((id) =>
          this.removeFeatureState(id, this.constrainedKey, sourceName)
        );
      });

    this.newScenarioState.doesNotMeetConstraintsStands$
      .pipe(untilDestroyed(this), withLatestFrom(this.sourceName$))
      .subscribe(([ids, sourceName]) => {
        this.paintConstrainedStands(ids, sourceName);
      });

    this.newScenarioState.excludedStands$
      .pipe(untilDestroyed(this), withLatestFrom(this.sourceName$))
      .subscribe(([ids, sourceName]) => {
        this.paintExcludedStands(ids, sourceName);
      });
  }

  ngAfterViewInit(): void {
    this.sourceName$.pipe(take(1)).subscribe((sourceName) => {
      if (!this.standsLoaded && this.mapLibreMap.isSourceLoaded(sourceName)) {
        this.newScenarioState.setBaseStandsLoaded(true);
        this.newScenarioState.setBaseStandsLoading(false);
        this.standsLoaded = true;
      }
    });
  }

  private buildTilesUrl$(): Observable<string> {
    return this.useIncludes$.pipe(
      // switchMap: if useIncludes changes midway through, cancel the previous pipe
      switchMap((useIncludes) =>
        this.newScenarioState.scenarioConfig$.pipe(
          filter((config) => !!config?.stand_size),
          map((config) => {
            const timestamp = new Date().toISOString();

            if (useIncludes) {
              if (this.hasParent) {
                return `${MARTIN_SOURCES.treatableStandsByProjectAreas.tilesUrl}?scenario_id=${this.scenarioId}`;
              }
              const baseUrl =
                MARTIN_SOURCES.scenarioStands.tilesWithIncludesUrl;
              return `${baseUrl}?scenario_id=${this.scenarioId}&stand_size=${config.stand_size}&datetime=${timestamp}`;
            }

            if (this.hasParent) {
              return (
                MARTIN_SOURCES.standsByProjectAreas.tilesUrl +
                `?scenario_id=${this.scenarioId}` +
                `&stand_size=${config.stand_size}` +
                `&datetime=${timestamp}`
              );
            }
            return (
              MARTIN_SOURCES.scenarioStands.tilesUrl +
              `?planning_area_id=${this.route.snapshot.data['planId']}` +
              `&stand_size=${config.stand_size}` +
              `&datetime=${timestamp}`
            );
          }),
          distinctUntilChanged(),
          tap(() => {
            this.newScenarioState.setBaseStandsLoading(true);
            this.newScenarioState.setBaseStandsLoaded(false);
            this.standsLoaded = false;
          })
        )
      )
    );
  }

  private paintStands(
    ids: number[],
    key: string,
    current: number[],
    sourceName: string
  ): number[] {
    current.forEach((id) => this.removeFeatureState(id, key, sourceName));
    ids.forEach((id) => this.setFeatureState(id, key, sourceName));
    return ids;
  }

  private paintExcludedStands(ids: number[], sourceName: string) {
    this.excludedStands = this.paintStands(
      ids,
      this.excludedKey,
      this.excludedStands,
      sourceName
    );
  }

  private paintConstrainedStands(ids: number[], sourceName: string) {
    this.constrainedStands = this.paintStands(
      ids,
      this.constrainedKey,
      this.constrainedStands,
      sourceName
    );
  }

  private onStyleDataListener = (sourceName: string) => {
    this.paintExcludedStands(this.excludedStands, sourceName);
    this.paintConstrainedStands(this.constrainedStands, sourceName);
  };

  private onDataListener = (event: MapSourceDataEvent, sourceName: string) => {
    if (
      event.sourceId !== sourceName ||
      !event.isSourceLoaded ||
      event.sourceDataType
    ) {
      return;
    }

    if (!this.standsLoaded) {
      this.zone.run(() => {
        this.newScenarioState.setBaseStandsLoaded(true);
        this.newScenarioState.setBaseStandsLoading(false);

        this.standsLoaded = true;
      });
    }

    this.paintExcludedStands(this.excludedStands, sourceName);
    this.paintConstrainedStands(this.constrainedStands, sourceName);
  };

  private isSourceReady(sourceName: string): boolean {
    try {
      return !!this.mapLibreMap.getSource(sourceName);
    } catch {
      return false;
    }
  }

  private setFeatureState(id: number, key: string, sourceName: string) {
    if (!this.isSourceReady(sourceName)) {
      // Don't passively wait for another 'sourcedata' event (it may never fire
      // if the user doesn't interact with the map again).
      // Explicitly retry on the next 'idle' event.
      this.mapLibreMap.once('idle', () =>
        this.setFeatureState(id, key, sourceName)
      );
      return;
    }
    try {
      this.mapLibreMap.setFeatureState(
        { source: sourceName, sourceLayer: sourceName, id },
        { [key]: true }
      );
    } catch {
      this.mapLibreMap.once('idle', () =>
        this.setFeatureState(id, key, sourceName)
      );
    }
  }

  private removeFeatureState(id: number, key: string, sourceName: string) {
    if (!this.isSourceReady(sourceName)) {
      return;
    }
    try {
      this.mapLibreMap.removeFeatureState(
        { source: sourceName, sourceLayer: sourceName, id },
        key
      );
    } catch {}
  }

  trackBySourceName(_index: number, sourceName: string): string {
    return sourceName;
  }
}
