import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { JsonPipe, NgForOf } from '@angular/common';
import { PlanService } from '@services';
import {
  LayerComponent,
  MapComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';

import { FilterSpecification, Map as MapLibreMap } from 'maplibre-gl';

@Component({
  selector: 'app-project-area',
  standalone: true,
  imports: [
    JsonPipe,
    NgForOf,
    MapComponent,
    VectorSourceComponent,
    LayerComponent,
  ],
  templateUrl: './project-area.component.html',
  styleUrl: './project-area.component.scss',
})
export class ProjectAreaComponent implements OnInit {
  map!: L.Map;
  maplibreMap!: MapLibreMap;
  ids: number[] = [];

  key = '52395617-45bd-4500-87d4-2159a35e3dcf';

  projectAreaId = 2710;

  selectedStands: number[] = [1344190];
  mapDragging = true;

  constructor(private planService: PlanService) {}

  ngOnInit() {
    this.planService.getProjectAreas(2710).subscribe((r) => console.log(r));
  }

  get overlayVectorLayerUrl() {
    return `http://localhost:4200/planscape-backend/tiles/project_area_outline/{z}/{x}/{y}?&project_area_id=${this.projectAreaId}`;
  }

  get standsVectorLayerUrl() {
    return `http://localhost:4200/planscape-backend/tiles/treatment_plan_prescriptions/{z}/{x}/{y}?&project_area_id=${this.projectAreaId}`;
  }

  private toggleStands(id: number) {
    if (this.selectedStands.includes(id)) {
      this.selectedStands = this.selectedStands.filter(
        (standId) => standId !== id
      );
    } else {
      this.selectedStands = [...this.selectedStands, id];
    }
  }

  toggle(id: number) {}

  toggleMapDrag() {
    if (this.mapDragging) {
      this.map.dragging.disable();
    } else {
      this.map.dragging.enable();
    }
    this.mapDragging = !this.mapDragging;
  }

  clickLayer(event: any) {
    const features = this.maplibreMap.queryRenderedFeatures(event.point, {
      layers: ['stands-layer'],
    });

    const standId = features[0].properties['id'];
    this.toggleStands(standId);
    this.updateMapFilter();
  }

  updateMapFilter(): void {
    this.mapFilter = ['in', ['get', 'id'], ['literal', this.selectedStands]];
  }

  mapFilter: FilterSpecification = [
    'in',
    ['get', 'id'],
    ['literal', this.selectedStands],
  ];
}
