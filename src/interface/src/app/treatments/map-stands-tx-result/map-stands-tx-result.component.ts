import { Component, Input, OnInit } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import {
  LayerComponent,
  PopupComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import {
  ColorSpecification,
  DataDrivenPropertyValueSpecification,
  LngLat,
  Map as MapLibreMap,
  MapMouseEvent,
  Point,
} from 'maplibre-gl';
import { SINGLE_STAND_SELECTED, STANDS_CELL_PAINT } from '../map.styles';
import { environment } from '../../../environments/environment';
import { DEFAULT_SLOT, ImpactsMetricSlot, SLOT_PALETTES } from '../metrics';
import { combineLatest, map, switchMap, take } from 'rxjs';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { TreatmentsState } from '../treatments.state';
import { descriptionForAction } from '../prescriptions';
import { FilterByActionPipe } from './filter-by-action.pipe';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-map-stands-tx-result',
  standalone: true,
  imports: [
    AsyncPipe,
    LayerComponent,
    VectorSourceComponent,
    PopupComponent,
    NgIf,
    FilterByActionPipe,
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

  constructor(
    private treatmentsState: TreatmentsState,
    private directImpactsStateService: DirectImpactsStateService
  ) {
    this.directImpactsStateService.activeMetric$.pipe().subscribe((m) => {
      this.paint = this.generatePaint(m.slot);
    });
  }

  readonly STANDS_CELL_PAINT = STANDS_CELL_PAINT;
  readonly STAND_SELECTED_PAINT = SINGLE_STAND_SELECTED;
  paint = {};

  tooltipLongLat: null | LngLat = null;
  appliedTreatment = '';

  vectorLayer$ = this.directImpactsStateService.activeMetric$.pipe(
    map((mapMetric) => {
      const plan = this.treatmentsState.getTreatmentPlanId();
      return (
        environment.martin_server +
        `stands_by_tx_result/{z}/{x}/{y}?treatment_plan_id=${plan}&variable=${mapMetric.metric.id}`
      );
    })
  );

  activeStand$ = this.directImpactsStateService.activeStand$;

  treatments$ = this.directImpactsStateService.filteredTreatmentTypes$;

  activeMetric$ = this.directImpactsStateService.activeMetric$;

  // If we get a null active stand we clear the stand selection
  activeStandId$ = this.activeStand$.pipe(map((stand) => stand?.id));

  setActiveStand(event: MapMouseEvent) {
    this.setActiveStandFromPoint(event.point);
    this.hideTooltip();
  }

  private setActiveStandFromPoint(point: Point) {
    const feature = this.getMapGeoJSONFeature(point);
    if (feature) {
      this.directImpactsStateService.setActiveStand(feature);
    }
  }

  ngOnInit(): void {
    this.updateStandOnTreatmentChanges();
    this.paint = this.generatePaint(DEFAULT_SLOT);
    this.directImpactsStateService.standsTxSourceLoaded$
      .pipe(
        untilDestroyed(this),
        switchMap((s) => this.activeStandId$.pipe(take(1)))
      )
      .subscribe((standId) => {
        if (standId) {
          const sourceFeatures = this.mapLibreMap.querySourceFeatures(
            'stands_by_tx_result',
            {
              sourceLayer: 'stands_by_tx_result',
              filter: ['==', ['get', 'id'], standId], // Filter for the specific stand ID
            }
          );
          if (sourceFeatures[0]) {
            this.directImpactsStateService.setActiveStand(sourceFeatures[0]);
          }
        }
      });
  }

  updateStandOnTreatmentChanges() {
    combineLatest([
      this.directImpactsStateService.filteredTreatmentTypes$,
      this.directImpactsStateService.activeStand$,
    ])
      .pipe(untilDestroyed(this))
      .subscribe(([treatments, stand]) => {
        if (
          treatments?.length &&
          !treatments.includes(stand?.properties?.['action'])
        ) {
          this.directImpactsStateService.resetActiveStand();
        }
      });
  }

  showTooltip(event: MapMouseEvent) {
    this.tooltipLongLat = event.lngLat;
    const feature = this.getMapGeoJSONFeature(event.point);
    const action = feature.properties['action'];
    if (action) {
      this.appliedTreatment = descriptionForAction(
        feature.properties['action']
      );
    } else {
      this.appliedTreatment = 'No Treatment';
    }
  }

  hideTooltip() {
    this.tooltipLongLat = null;
  }

  private getMapGeoJSONFeature(point: Point) {
    const features = this.mapLibreMap.queryRenderedFeatures(point, {
      layers: ['standsFill'],
    });
    return features[0];
  }

  private generatePaint(slot: ImpactsMetricSlot) {
    return {
      'fill-color': [
        'case',
        // Check if 'action' property is null
        ['==', ['get', 'action'], ['literal', null]],
        '#ffffff', // White for null 'action'
        [
          // If 'action' is not null, apply the existing logic
          'case',
          ['==', ['get', this.propertyName], ['literal', null]], // Check for null values
          '#ffffff', // White for null 'propertyName'
          [
            'interpolate',
            ['linear'],
            ['get', this.propertyName],
            ...this.getPalette(slot),
          ],
        ],
      ] as DataDrivenPropertyValueSpecification<ColorSpecification>,
      'fill-opacity': 0.8,
    };
  }

  private getPalette(slot: ImpactsMetricSlot) {
    const palette = SLOT_PALETTES[slot];
    return [
      -1,
      palette[0],
      -0.5,
      palette[1],
      0,
      palette[2],
      0.5,
      palette[3],
      1,
      palette[4],
    ];
  }
}
