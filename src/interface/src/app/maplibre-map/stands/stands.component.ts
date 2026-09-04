import {
  AfterViewInit,
  Component,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
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
  map,
  Observable,
  observeOn,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import { FilterSpecification, Map as MapLibreMap } from 'maplibre-gl';
import { NewScenarioState } from '@scenario-creation/new-scenario.state';
import { MapConfigState } from '../map-config.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FrontendConstants } from '@map/map.constants';

/**
  Replaces ScenarioStandsComponent + PlanningAreaStandsComponent.
  
  Previously, two different components were swapped using *ngIf/else based on
  showStandsWithIncludes$, which caused a full destroy + create cycle
  (and sometimes a DOUBLE one, due to a race condition between
  showScenarioStands$ and showStandsWithIncludes$, since they are
  independent streams).
 
  Now, there is a single instance that remains mounted and reacts internally
  to currentStep$ (the single source of truth) to determine the sourceName/tilesUrl.
  When switching steps, the tileset legitimately changes (so it still needs to
  reload once, which is unavoidable), but the component is no longer
  destroyed/recreated, and the map listeners are no longer re-registered.
 */
@UntilDestroy()
@Component({
  selector: 'app-stands',
  standalone: true,
  imports: [AsyncPipe, LayerComponent, NgIf, VectorSourceComponent, NgFor],
  templateUrl: './stands.component.html',
})
export class StandsComponent implements OnInit, AfterViewInit, OnDestroy {
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

  // Synchronous mirror of useIncludes$, used in non-async getters/listeners
  private useIncludes = false;

  /** true when the current step corresponds to the "with includes" flow */
  useIncludes$ = this.newScenarioState.currentStep$.pipe(
    map((step) => !!step?.withIncludes),
    distinctUntilChanged()
  );

  opacity$ = this.mapConfigState.opacity$;

  tilesUrl$!: Observable<string>;

  get planId(): string | undefined {
    if (this.useIncludes) {
      return this.hasParent ? this.route.snapshot.data['planId'] : undefined;
    }
    return this.hasParent ? undefined : this.route.snapshot.data['planId'];
  }

  get sourceName(): string {
    if (this.useIncludes) {
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
    // Keep the synchronous useIncludes mirror updated BEFORE building tilesUrl$,
    // so the getters (sourceName/planId) are consistent as soon as they are read.
    this.useIncludes$
      .pipe(untilDestroyed(this))
      .subscribe((useIncludes) => (this.useIncludes = useIncludes));

    this.tilesUrl$ = this.buildTilesUrl$();

    this.mapLibreMap.on('sourcedata', this.onDataListener);
    this.mapLibreMap.on('styledata', this.onStyleDataListener);

    // clear constrained stands when navigating to a step that doesn't include constraints (or pre-step).
    this.newScenarioState.currentStep$
      .pipe(
        untilDestroyed(this),
        filter((step) => step === null || !step.includeConstraints)
      )
      .subscribe(() => {
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

  ngAfterViewInit(): void {
    if (
      !this.standsLoaded &&
      this.mapLibreMap.isSourceLoaded(this.sourceName)
    ) {
      this.newScenarioState.setBaseStandsLoaded(true);
      this.newScenarioState.setBaseStandsLoading(false);
      this.standsLoaded = true;
    }
  }

  ngOnDestroy(): void {
    this.mapLibreMap.off('sourcedata', this.onDataListener);
    this.mapLibreMap.off('styledata', this.onStyleDataListener);
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
              `?planning_area_id=${this.planId}` +
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

  private paintStands(ids: number[], key: string, current: number[]): number[] {
    current.forEach((id) => this.removeFeatureState(id, key));
    ids.forEach((id) => this.setFeatureState(id, key));
    return ids;
  }

  private paintExcludedStands(ids: number[]) {
    this.excludedStands = this.paintStands(
      ids,
      this.excludedKey,
      this.excludedStands
    );
  }

  private paintConstrainedStands(ids: number[]) {
    this.constrainedStands = this.paintStands(
      ids,
      this.constrainedKey,
      this.constrainedStands
    );
  }

  private onStyleDataListener = () => {
    this.paintExcludedStands(this.excludedStands);
    this.paintConstrainedStands(this.constrainedStands);
  };

  private onDataListener = (event: any) => {
    if (
      event.sourceId !== this.sourceName ||
      !event.isSourceLoaded ||
      event.type !== 'sourcedata' ||
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

    this.paintExcludedStands(this.excludedStands);
    this.paintConstrainedStands(this.constrainedStands);
  };

  private isSourceReady(): boolean {
    try {
      return !!this.mapLibreMap.getSource(this.sourceName);
    } catch {
      return false;
    }
  }

  private setFeatureState(id: number, key: string) {
    if (!this.isSourceReady()) {
      // Don't passively wait for another 'sourcedata' event (it may never fire
      // if the user doesn't interact with the map again).
      // Explicitly retry on the next 'idle' event.
      this.mapLibreMap.once('idle', () => this.setFeatureState(id, key));
      return;
    }
    try {
      this.mapLibreMap.setFeatureState(
        { source: this.sourceName, sourceLayer: this.sourceName, id },
        { [key]: true }
      );
    } catch {
      this.mapLibreMap.once('idle', () => this.setFeatureState(id, key));
    }
  }

  private removeFeatureState(id: number, key: string) {
    if (!this.isSourceReady()) {
      return;
    }
    try {
      this.mapLibreMap.removeFeatureState(
        { source: this.sourceName, sourceLayer: this.sourceName, id },
        key
      );
    } catch {
      // Same as setFeatureState — remove is best-effort, so there's no need to
      // retry aggressively: if the ID no longer exists in the new source,
      // there's nothing to remove.
    }
  }

  trackBySourceName(_index: number, sourceName: string): string {
    return sourceName;
  }
}
