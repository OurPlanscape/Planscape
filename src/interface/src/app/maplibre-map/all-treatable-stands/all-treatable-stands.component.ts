import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
  selector: 'app-all-treatable-stands',
  standalone: true,
  imports: [LayerComponent, VectorSourceComponent],
  templateUrl: './all-treatable-stands.component.html',
})
export class AllTreatableStandsComponent {
  @Input() mapLibreMap!: MapLibreMap;

  readonly martinSource = MARTIN_SOURCES.treatableStandsByScenario;

  scenarioId = this.route.snapshot.data['scenarioId'];

  readonly vectorLayer =
    this.martinSource.tilesUrl + `?scenario_id=${this.scenarioId}`;

  readonly standPaint = {
    'fill-color': BASE_COLORS.dark_magenta,
    'fill-opacity-transition': { duration: 0 },
    'fill-opacity': 0.1,
  };

  readonly standOutlinePaint = {
    'line-color': BASE_COLORS.dark_magenta,
    'line-width': 1.5,
    'line-opacity': 1,
  };

  constructor(private readonly route: ActivatedRoute) {}
}
