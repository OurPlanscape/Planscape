import { Component, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { BASE_COLORS } from '../../treatments/map.styles';
import { AsyncPipe, NgIf } from '@angular/common';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { ActivatedRoute } from '@angular/router';
import { MARTIN_SOURCES } from '../../treatments/map.sources';
import { ScenarioState } from '../../scenario/scenario.state';
import { map, tap } from 'rxjs';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import { ScenarioMapService } from '../scenario-map.service';
import { Map as MapLibreMap } from 'maplibre-gl';

@Component({
  selector: 'app-scenario-stands',
  standalone: true,
  imports: [AsyncPipe, LayerComponent, NgIf, VectorSourceComponent],
  templateUrl: './scenario-stands.component.html',
})
export class ScenarioStandsComponent implements OnInit, OnDestroy {
  @Input() mapLibreMap!: MapLibreMap;

  protected readonly COLORS = BASE_COLORS;
  sourceName = MARTIN_SOURCES.scenarioStands.sources.stands;

  planId = this.route.snapshot.data['planId'];

  tilesUrl$ = this.scenarioState.scenarioConfig$.pipe(
    filter((config) => !!config.stand_size),
    map(
      (config) =>
        MARTIN_SOURCES.scenarioStands.tilesUrl +
        `?planning_area_id=${this.planId}&stand_size=${config.stand_size}`
    ),
    distinctUntilChanged(),
    tap((s) => {
      this.scenarioMapService.setLoading(true);
    })
  );

  constructor(
    private route: ActivatedRoute,
    private scenarioState: ScenarioState,
    private scenarioMapService: ScenarioMapService,
    private zone: NgZone
  ) {}

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
        this.scenarioMapService.setLoading(false);
      });
    }
  };
}
