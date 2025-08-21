import { Component } from '@angular/core';
import { BASE_COLORS } from '../../treatments/map.styles';
import { AsyncPipe, NgIf } from '@angular/common';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { ActivatedRoute } from '@angular/router';
import { MARTIN_SOURCES } from '../../treatments/map.sources';
import { ScenarioState } from '../../scenario/scenario.state';
import { map } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-scenario-stands',
  standalone: true,
  imports: [AsyncPipe, LayerComponent, NgIf, VectorSourceComponent],
  templateUrl: './scenario-stands.component.html',
  styleUrl: './scenario-stands.component.scss',
})
export class ScenarioStandsComponent {
  protected readonly COLORS = BASE_COLORS;
  sourceName = MARTIN_SOURCES.scenarioStands.sources.stands;

  scenarioId = this.route.snapshot.data['scenarioId'];
  planId = this.route.snapshot.data['planId'];

  tilesUrl$ = this.scenarioState.scenarioConfig$.pipe(
    filter((config) => !!config.stand_size),
    map(
      (config) =>
        MARTIN_SOURCES.scenarioStands.tilesUrl +
        `?planning_area_id=${this.planId}&stand_size=${config.stand_size}`
    )
  );

  constructor(
    private route: ActivatedRoute,
    private scenarioState: ScenarioState
  ) {}
}
