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

  readonly resultsVectorSourceName = 'stands_by_tx_result';
  readonly resultsVectorSourceLayerName = 'stands_by_tx_result';
  readonly treatmentStandsSourceName = 'treatment_stands';
  readonly treatmentStandsSourceLayer = 'stands_by_tx_plan';

  constructor(
    private treatmentsState: TreatmentsState,
    private mapConfigState: MapConfigState,
    private directImpactsStateService: DirectImpactsStateService
  ) {}

  readonly STAND_SELECTED_PAINT = SINGLE_STAND_SELECTED;
  readonly SINGLE_STAND_HOVER = SINGLE_STAND_HOVER;

  tooltipLongLat: null | LngLat = null;
  appliedTreatment: string[] = [];

  standsResultVectorLayer$ = this.directImpactsStateService.activeMetric$.pipe(
    map((mapMetric) => {
      const plan = this.treatmentsState.getTreatmentPlanId();
      return (
        environment.martin_server +
        `stands_by_tx_result/{z}/{x}/{y}?treatment_plan_id=${plan}&variable=${mapMetric.id}`
      );
    })
  );

  // Use the stands_by_tx_plan layer for drawing the selected stand, to avoid
  // the selected stand being hidden / not draw when `standsResultVectorLayer$` changes
  get standsVectorLayer() {
    const plan = this.treatmentsState.getTreatmentPlanId();
    return (
      environment.martin_server +
      `stands_by_tx_plan/{z}/{x}/{y}?treatment_plan_id=${plan}`
    );
  }

  activeStand$ = this.directImpactsStateService.activeStand$;

  // If we get a null active stand we clear the stand selection
  activeStandId$ = this.activeStand$.pipe(map((stand) => stand?.id));

  private hoverStandId: number | string | null = null;
  // list of previous hovered stands, used to clean hover feature state
  private hoveredStands: (string | number)[] = [];

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
          // get data from the map, specific for this stand id
          const sourceFeatures = this.mapLibreMap.querySourceFeatures(
            this.resultsVectorSourceName,
            {
              sourceLayer: this.resultsVectorSourceName,
              filter: ['==', ['get', 'id'], standId],
            }
          );
          // if we got data, update the active stand data with the new version
          if (sourceFeatures[0]) {
            this.directImpactsStateService.setActiveStand(sourceFeatures[0]);
          }
        }
      });
  }

  hoverOnStand(event: MapMouseEvent) {
    if (!this.mapConfigState.isStandSelectionEnabled()) {
      return;
    }

    this.tooltipLongLat = event.lngLat;
    const feature = this.getMapGeoJSONFeature(event.point);
    const action = feature.properties['action'];

    if (feature && feature.id && feature.id != this.hoverStandId) {
      this.removePreviousHover();
      this.paintHover(feature.id);
      this.hoverStandId = feature.id;
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
        source: this.treatmentStandsSourceName,
        sourceLayer: this.treatmentStandsSourceLayer,
        id: id,
      });
    });
    this.hoveredStands = [];
  }

  private paintHover(id: string | number) {
    this.hoveredStands.push(id);
    this.mapLibreMap.setFeatureState(
      {
        source: this.treatmentStandsSourceName,
        sourceLayer: this.treatmentStandsSourceLayer,
        id: id,
      },
      { hover: true }
    );
  }

  hoverOutStand() {
    this.tooltipLongLat = null;
    this.hoverStandId = null;
    this.removePreviousHover();
  }

  private getMapGeoJSONFeature(point: Point) {
    const features = this.mapLibreMap.queryRenderedFeatures(point, {
      layers: ['standsFill'],
    });

    return features[0];
  }
}
