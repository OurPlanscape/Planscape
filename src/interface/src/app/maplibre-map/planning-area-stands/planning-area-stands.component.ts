import {
  AfterViewInit,
  Component,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { BASE_COLORS } from '@treatments/map.styles';
import { AsyncPipe, NgIf } from '@angular/common';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { ActivatedRoute } from '@angular/router';
import { MARTIN_SOURCES } from '@treatments/map.sources';
import {
  animationFrameScheduler,
  auditTime,
  concat,
  map,
  observeOn,
  of,
  tap,
} from 'rxjs';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import { Map as MapLibreMap } from 'maplibre-gl';
import { NewScenarioState } from '@scenario-creation/new-scenario.state';
import { MapConfigState } from '../map-config.state';
import { UntilDestroy } from '@ngneat/until-destroy';
import { FrontendConstants } from '@map/map.constants';

@UntilDestroy()
@Component({
  selector: 'app-planning-area-stands',
  standalone: true,
  imports: [AsyncPipe, LayerComponent, NgIf, VectorSourceComponent],
  templateUrl: './planning-area-stands.component.html',
})
export class PlanningAreaStandsComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input() mapLibreMap!: MapLibreMap;
  readonly sourceName = MARTIN_SOURCES.scenarioStands.sources.stands;
  readonly planId = this.route.snapshot.data['planId'];

  private standsLoaded = false;

  tilesUrl$ = this.newScenarioState.scenarioConfig$.pipe(
    filter((config) => !!config.stand_size),
    map(
      (config) =>
        // passing datetime to clear the cache
        MARTIN_SOURCES.scenarioStands.tilesUrl +
        `?planning_area_id=${this.planId}&stand_size=${config.stand_size}&datetime=${new Date().toISOString()}`
    ),
    distinctUntilChanged(),
    // when the stand size changes, set as loading
    tap(() => {
      this.newScenarioState.setLoading(true);
      this.standsLoaded = false;
    })
  );

  opacity$ = this.mapConfigState.opacity$;

  constructor(
    private route: ActivatedRoute,
    private newScenarioState: NewScenarioState,
    private zone: NgZone,
    private mapConfigState: MapConfigState
  ) {}

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
        'fill-color': BASE_COLORS.dark_magenta,
        'fill-opacity-transition': { duration: 0 },
        'fill-outline-color': BASE_COLORS.darker_magenta,
        'fill-opacity': opacity,
      } as any;
    })
  );

  ngOnInit(): void {
    this.mapLibreMap.on('sourcedata', this.onDataListener);
  }

  ngAfterViewInit(): void {
    // If tiles are already loaded (cached from a previous mount), sourcedata won't re-fire.
    // Check here — after mgl-vector-source has initialized — to avoid leaving loading stuck.
    if (
      !this.standsLoaded &&
      this.mapLibreMap.isSourceLoaded(this.sourceName)
    ) {
      this.newScenarioState.setBaseStandsLoaded(true);
      this.standsLoaded = true;
    }
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
        this.standsLoaded = true;
      });
    }
  };
}
