import { Component, Input, OnInit } from '@angular/core';

import { AsyncPipe, DecimalPipe, NgFor, NgIf } from '@angular/common';

import {
  LayerComponent,
  PopupComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { LngLat, Map as MapLibreMap, MapMouseEvent, Point } from 'maplibre-gl';
import { SINGLE_STAND_HOVER, SINGLE_STAND_SELECTED } from '../map.styles';
import { environment } from '../../../environments/environment';
import { map, switchMap, take } from 'rxjs';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { TreatmentsState } from '../treatments.state';
import { descriptionsForAction } from '../prescriptions';
import { FilterByActionPipe } from './filter-by-action.pipe';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MapConfigState } from '../treatment-map/map-config.state';

@UntilDestroy()
@Component({
  selector: 'app-map-stands-tx-result',
  standalone: true,
  imports: [
    AsyncPipe,
    LayerComponent,
    VectorSourceComponent,
    PopupComponent,
    NgFor,
    NgIf,
    FilterByActionPipe,
    DecimalPipe,
  ],
  templateUrl: './map-stands-tx-result.component.html',
  styleUrl: './map-stands-tx-result.component.scss',
})
export class MapStandsTxResultComponent implements OnInit {
  /**
   * The instance of mapLibreMap used with this component.
   * Must be provided while using this component.
   */
  @Input() mapLibreMap!: MapLibreMap;
  @Input() propertyName!: string;

  readonly vectorSourceName = 'stands_by_tx_result';

  hoverPaint = {
    'line-color': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      '#f8f802',
      '#00000000',
    ],
    'line-width': 4,
  } as any;

  constructor(
    private treatmentsState: TreatmentsState,
    private mapConfigState: MapConfigState,
    private directImpactsStateService: DirectImpactsStateService
  ) {}

  readonly STAND_SELECTED_PAINT = SINGLE_STAND_SELECTED;
  readonly SINGLE_STAND_HOVER = SINGLE_STAND_HOVER;
  paint = {};

  tooltipLongLat: null | LngLat = null;
  appliedTreatment: string[] = [];

  vectorLayer$ = this.directImpactsStateService.activeMetric$.pipe(
    map((mapMetric) => {
      const plan = this.treatmentsState.getTreatmentPlanId();
      return (
        environment.martin_server +
        `stands_by_tx_result/{z}/{x}/{y}?treatment_plan_id=${plan}&variable=${mapMetric.id}`
      );
    })
  );

  activeStand$ = this.directImpactsStateService.activeStand$;

  // If we get a null active stand we clear the stand selection
  activeStandId$ = this.activeStand$.pipe(map((stand) => stand?.id));

  hoverStand: number | string | null = null;

  projectAreaData = { name: '', acres: 0 };

  setActiveStand(event: MapMouseEvent) {
    if (!this.mapConfigState.isStandSelectionEnabled()) {
      return;
    }
    this.setActiveStandFromPoint(event.point);
    this.hoverOutStand();
  }

  private setActiveStandFromPoint(point: Point) {
    const feature = this.getMapGeoJSONFeature(point);
    if (feature) {
      this.directImpactsStateService.setActiveStand(feature);
    }
  }

  ngOnInit(): void {
    this.directImpactsStateService.standsTxSourceLoaded$
      .pipe(
        untilDestroyed(this),
        switchMap((s) => this.activeStandId$.pipe(take(1)))
      )
      .subscribe((standId) => {
        if (standId) {
          const sourceFeatures = this.mapLibreMap.querySourceFeatures(
            this.vectorSourceName,
            {
              sourceLayer: this.vectorSourceName,
              filter: ['==', ['get', 'id'], standId], // Filter for the specific stand ID
            }
          );
          if (sourceFeatures[0]) {
            this.directImpactsStateService.setActiveStand(sourceFeatures[0]);
          }
        }
      });
  }

  hoveredStands: (string | number)[] = [];

  hoverOnStand(event: MapMouseEvent) {
    if (!this.mapConfigState.isStandSelectionEnabled()) {
      return;
    }

    this.tooltipLongLat = event.lngLat;
    const feature = this.getMapGeoJSONFeature(event.point);
    const action = feature.properties['action'];

    if (feature && feature.id && feature.id != this.hoverStand) {
      this.removePreviousHover();
      this.paintHover(feature.id);
      this.hoverStand = feature.id;
    }
    const projectAreaName = feature.properties['project_area_name'];
    this.projectAreaData = {
      name: projectAreaName,
      acres: this.treatmentsState.getAcresForProjectArea(projectAreaName),
    };
    if (action) {
      this.appliedTreatment = descriptionsForAction(
        feature.properties['action']
      );
    } else {
      this.appliedTreatment = ['No Treatment'];
    }
  }

  private removePreviousHover() {
    this.hoveredStands.forEach((id) => {
      this.mapLibreMap.removeFeatureState({
        source: this.vectorSourceName,
        sourceLayer: this.vectorSourceName,
        id: id,
      });
    });
    this.hoveredStands = [];
  }

  private paintHover(id: string | number) {
    this.hoveredStands.push(id);
    this.mapLibreMap.setFeatureState(
      {
        source: this.vectorSourceName,
        sourceLayer: this.vectorSourceName,
        id: id,
      },
      { hover: true }
    );
  }

  hoverOutStand() {
    this.tooltipLongLat = null;
    this.hoverStand = null;
    this.removePreviousHover();
  }

  private getMapGeoJSONFeature(point: Point) {
    const features = this.mapLibreMap.queryRenderedFeatures(point, {
      layers: ['standsFill'],
    });

    return features[0];
  }
}
