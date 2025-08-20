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

@Component({
  selector: 'app-scenario-stands',
  standalone: true,
  imports: [AsyncPipe, LayerComponent, NgIf, VectorSourceComponent],
  templateUrl: './scenario-stands.component.html',
  styleUrl: './scenario-stands.component.scss',
})
export class ScenarioStandsComponent {
  protected readonly COLORS = BASE_COLORS;
  sourceName = 'stands_by_scenario';

  scenarioId = this.route.snapshot.data['scenarioId'];
  tilesUrl =
    MARTIN_SOURCES.scenarioStands.tilesUrl + `?scenario_id=${this.scenarioId}`;

  tilesUrl$ = this.scenarioState.currentScenarioId$.pipe(
    map((id) => MARTIN_SOURCES.scenarioStands.tilesUrl + `?scenario_id=${id}`)
  );

  constructor(
    private route: ActivatedRoute,
    private scenarioState: ScenarioState
  ) {
    console.log(this.route.snapshot);
  }
}
