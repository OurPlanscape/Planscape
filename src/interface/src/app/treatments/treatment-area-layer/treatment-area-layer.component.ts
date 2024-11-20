import { Component, inject, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
} from '@maplibre/ngx-maplibre-gl';
import { PlanService } from '@services';
import { Geometry } from 'geojson';
import { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';

@Component({
  selector: 'app-treatment-area-layer',
  standalone: true,
  imports: [FeatureComponent, GeoJSONSourceComponent, LayerComponent],
  templateUrl: './treatment-area-layer.component.html',
  styleUrl: './treatment-area-layer.component.scss',
})
export class TreatmentAreaLayerComponent implements OnInit {
  @Input() mapLibreMap!: MapLibreMap;

  planService: PlanService = inject(PlanService);
  route: ActivatedRoute = inject(ActivatedRoute);

  planId!: string;

  readonly sourceName = 'tratment-planing-area';

  polygonGeometry: Geometry = {
    type: 'Polygon',
    coordinates: [[]],
  };

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.planId = params.get('planId') || '';

      this.planService.getPlan(this.planId).subscribe((plan) => {
        if (plan.geometry) {
          this.polygonGeometry = plan.geometry as Geometry;
          this.updateArea();
        }
      });
    });
  }

  private updateArea() {
    (this.mapLibreMap.getSource(this.sourceName) as GeoJSONSource)?.setData(
      this.polygonGeometry
    );
  }
}
