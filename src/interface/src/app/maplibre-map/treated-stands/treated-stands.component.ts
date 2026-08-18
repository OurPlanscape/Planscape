import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FrontendConstants } from '@app/map/map.constants';
import { MARTIN_SOURCES } from '@app/treatments/map.sources';
import { BASE_COLORS } from '@app/treatments/map.styles';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Map as MapLibreMap } from 'maplibre-gl';

@UntilDestroy()
@Component({
  selector: 'app-treated-stands',
  standalone: true,
  imports: [LayerComponent, VectorSourceComponent],
  templateUrl: './treated-stands.component.html',
  styleUrl: './treated-stands.component.scss',
})
export class TreatedStandsComponent {
  @Input() mapLibreMap!: MapLibreMap;

  readonly martinSource = MARTIN_SOURCES.projectAreasByScenario;

  readonly scenarioId = this.route.snapshot.data['scenarioId'];

  readonly vectorLayer =
    this.martinSource.tilesUrl + `?scenario_id=${this.scenarioId}`;

  readonly standPaint = {
    'fill-color': BASE_COLORS.yellow,
    'fill-outline-color': BASE_COLORS.yellow,
    'fill-opacity-transition': { duration: 0 },
    'fill-opacity': FrontendConstants.MAPLIBRE_MAP_DATA_LAYER_OPACITY,
  };

  constructor(private readonly route: ActivatedRoute) {}
}
