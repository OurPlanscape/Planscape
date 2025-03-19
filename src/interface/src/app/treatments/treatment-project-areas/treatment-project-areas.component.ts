import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MapProjectAreasComponent } from 'src/app/maplibre-map/map-project-areas/map-project-areas.component';
import { MapTooltipComponent } from '../map-tooltip/map-tooltip.component';
import { TreatmentsState } from '../treatments.state';
import { LngLat, MapGeoJSONFeature, MapMouseEvent, Point } from 'maplibre-gl';
import {
  combineLatest,
  distinctUntilChanged,
  map,
  Observable,
  Subject,
} from 'rxjs';
import { TreatmentProjectArea } from '@types';

@Component({
  selector: 'app-treatment-project-areas',
  standalone: true,
  imports: [CommonModule, MapProjectAreasComponent, MapTooltipComponent],
  templateUrl: './treatment-project-areas.component.html',
  styleUrl: './treatment-project-areas.component.scss',
})
export class TreatmentProjectAreasComponent {
  @Input() mapLibreMap!: any;
  mouseLngLat: LngLat | null = null;

  scenarioId = this.treatmentsState.getScenarioId();
  summary$ = this.treatmentsState.summary$;

  hoveredProjectAreaId$ = new Subject<number | null>();
  hoveredProjectAreaFromFeatures: MapGeoJSONFeature | null = null;
  hoveredProjectArea$: Observable<TreatmentProjectArea | undefined> =
    combineLatest([
      this.summary$,
      this.hoveredProjectAreaId$.pipe(distinctUntilChanged()),
    ]).pipe(
      map(([summary, projectAreaId]) => {
        return summary?.project_areas.find(
          (p: TreatmentProjectArea) => p.project_area_id === projectAreaId
        );
      })
    );

  constructor(private treatmentsState: TreatmentsState) {}

  setProjectAreaTooltip(e: MapMouseEvent) {
    // if I have a project area ID im transitioning to the project area view,
    // so we won't set a tooltip here
    if (this.treatmentsState.getProjectAreaId()) {
      return;
    }
    this.hoveredProjectAreaFromFeatures = this.getProjectAreaFromFeatures(
      e.point
    );
    if (this.hoveredProjectAreaFromFeatures?.properties?.['id']) {
      this.hoveredProjectAreaId$.next(
        this.hoveredProjectAreaFromFeatures.properties['id']
      );
    }

    this.mouseLngLat = e.lngLat;
  }

  setProjectAreaId(value: number | null) {
    this.hoveredProjectAreaId$.next(value);
  }

  private getProjectAreaFromFeatures(point: Point): MapGeoJSONFeature {
    const features = this.mapLibreMap.queryRenderedFeatures(point, {
      layers: ['map-project-areas-fill'],
    });

    return features[0];
  }
}
