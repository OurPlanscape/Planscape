import { Component, Input, OnInit } from '@angular/core';
import { ScenarioService } from '@services';
import { Feature, FeatureCollection, Geometry } from 'geojson';
import {
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
} from '@maplibre/ngx-maplibre-gl';
import { NgForOf } from '@angular/common';
import { getColorForProjectPosition } from '../../plan/plan-helpers';
import { bbox } from '@turf/bbox';
import { Map as MapLibreMap } from 'maplibre-gl';

@Component({
  selector: 'app-map-project-areas',
  standalone: true,
  imports: [FeatureComponent, GeoJSONSourceComponent, NgForOf, LayerComponent],
  templateUrl: './map-project-areas.component.html',
  styleUrl: './map-project-areas.component.scss',
})
export class MapProjectAreasComponent implements OnInit {
  @Input() scenarioId!: number;
  @Input() mapLibreMap!: MapLibreMap;
  shapes: Feature[] = [];

  constructor(private scenarioService: ScenarioService) {}

  color(i: number) {
    return getColorForProjectPosition(i);
  }

  ngOnInit(): void {
    // todo move this to the consumer? always asume scenarioId
    if (this.scenarioId) {
      this.scenarioService
        .getScenario(this.scenarioId.toString())
        .subscribe((scenario) => {
          if (scenario.scenario_result?.result.features) {
            const featureCollection = scenario.scenario_result?.result;
            this.shapes = featureCollection.features as any as Feature<
              Geometry,
              { proj_id: number }
            >[];

            const boundingBox = bbox(
              featureCollection as any as FeatureCollection
            );
            this.mapLibreMap.fitBounds([
              [boundingBox[0], boundingBox[1]],
              [boundingBox[2], boundingBox[3]],
            ]);
          }
        });
    }
  }
}
