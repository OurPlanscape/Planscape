import { Component } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf, PercentPipe } from '@angular/common';
import {
  ControlComponent,
  DraggableDirective,
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
  MapComponent,
  PopupComponent,
  RasterSourceComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import {
  LngLat,
  Map as MapLibreMap,
  MapMouseEvent,
  RequestTransformFunction,
} from 'maplibre-gl';
import { MapStandsComponent } from '../map-stands/map-stands.component';
import { MapRectangleComponent } from '../map-rectangle/map-rectangle.component';
import { MapActionButtonComponent } from '../map-action-button/map-action-button.component';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MatIconModule } from '@angular/material/icon';
import { MapTooltipComponent } from '../map-tooltip/map-tooltip.component';
import { AuthService } from '@services';
import { TreatmentsState } from '../treatments.state';
import { addRequestHeaders } from '../../maplibre-map/maplibre.helper';
import { PlanningAreaLayerComponent } from '../../maplibre-map/planning-area-layer/planning-area-layer.component';
import { combineLatest, map, Observable, Subject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { SelectedStandsState } from './selected-stands.state';
import { canEditTreatmentPlan } from 'src/app/plan/permissions';
import { MatLegacySlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { OpacitySliderComponent } from '@styleguide';
import { FeaturesModule } from 'src/app/features/features.module';
import { MapBaseDropdownComponent } from 'src/app/maplibre-map/map-base-dropdown/map-base-dropdown.component';
import { MapNavbarComponent } from '../../maplibre-map/map-nav-bar/map-nav-bar.component';
import { DataLayersStateService } from '../../data-layers/data-layers.state.service';
import { MapProjectAreasComponent } from '../../maplibre-map/map-project-areas/map-project-areas.component';
import { FrontendConstants, TreatmentProjectArea } from '@types';
import { DataLayerNameComponent } from '../../data-layers/data-layer-name/data-layer-name.component';
import { ActivatedRoute, Router } from '@angular/router';
import { PlanState } from '../../plan/plan.state';
import { MapLayerColorLegendComponent } from 'src/app/maplibre-map/map-layer-color-legend/map-layer-color-legend.component';
import { MapDataLayerComponent } from '../../maplibre-map/map-data-layer/map-data-layer.component';
import { MapZoomControlComponent } from '../../maplibre-map/map-zoom-control/map-zoom-control.component';
import { RxSelectionToggleComponent } from '../../maplibre-map/rx-selection-toggle/rx-selection-toggle.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseLayersComponent } from '../../base-layers/base-layers/base-layers.component';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';
import { MapBaseLayersComponent } from '../../maplibre-map/map-base-layers/map-base-layers.component';
import { MultiMapControlComponent } from '../../maplibre-map/multi-map-control/multi-map-control.component';

@UntilDestroy()
@Component({
  selector: 'app-treatment-map',
  standalone: true,
  imports: [
    NgForOf,
    MapComponent,
    VectorSourceComponent,
    RasterSourceComponent,
    LayerComponent,
    FeatureComponent,
    DraggableDirective,
    GeoJSONSourceComponent,
    MapActionButtonComponent,
    MapStandsComponent,
    MapRectangleComponent,
    MapProjectAreasComponent,
    MapLayerColorLegendComponent,
    NgIf,
    AsyncPipe,
    MatIconModule,
    PopupComponent,
    MapDataLayerComponent,
    MapTooltipComponent,
    PlanningAreaLayerComponent,
    ControlComponent,
    MatLegacySlideToggleModule,
    OpacitySliderComponent,
    FeaturesModule,
    MapBaseDropdownComponent,
    MapZoomControlComponent,
    MapNavbarComponent,
    PercentPipe,
    DataLayerNameComponent,
    RxSelectionToggleComponent,
    MatTooltipModule,
    BaseLayersComponent,
    MapBaseLayerComponent,
    MapBaseLayersComponent,
    MultiMapControlComponent,
  ],
  templateUrl: './treatment-map.component.html',
  styleUrl: './treatment-map.component.scss',
})
export class TreatmentMapComponent {
  /**
   * Flag to determine if the user is currently dragging to select stands
   */
  private dragStandsSelection = false;

  /**
   * Starting point for dragging selection
   */
  mouseStart: MapMouseEvent | null = null;

  /**
   * End point for dragging selection
   */
  mouseEnd: MapMouseEvent | null = null;

  /**
   * The mapLibreMap instance, set by the map `mapLoad` event.
   */
  mapLibreMap!: MapLibreMap;

  /**
   * Maplibre defaults
   */
  minZoom = FrontendConstants.MAPLIBRE_MAP_MIN_ZOOM;
  maxZoom = FrontendConstants.MAPLIBRE_MAP_MAX_ZOOM;

  /**
   * Observable that provides the url to load the selected map base layer
   */
  baseLayerUrl$ = this.mapConfigState.baseLayerUrl$;

  /**
   * Observable that provides if stand selection is enabled
   */
  standSelectionEnabled$ = this.mapConfigState.standSelectionEnabled$;

  /**
   * Observable that provides the map extent (bounds) for the treatment plan or project area
   */
  mapExtent$ = this.mapConfigState.mapExtent$;

  boundOptions = FrontendConstants.MAPLIBRE_BOUND_OPTIONS;

  /**
   * Observable (boolean) for whether the treatment legend should be visible
   *  If not, and if we are showing treatments, we show the action button, instead.
   */
  showLegend$ = this.mapConfigState.showTreatmentLegend$;

  selectedDataLayer$ = this.dataLayersStateService.selectedDataLayer$;

  showMapProjectAreas$ = this.mapConfigState.showProjectAreasLayer$;

  /**
   * Observable to determine if we show the map controls
   */
  showMapControls$ = this.mapConfigState.showMapControls$;

  /**
   * The LongLat position of the helper tooltip attached to the mouse cursor when selecting stands.
   * If null, the tooltip is hidden.
   */
  treatmentTooltipLngLat: LngLat | null = null;

  /**
   * permissions for current user
   */
  userCanEditStands: boolean = false;
  opacity$ = this.mapConfigState.treatedStandsOpacity$;

  mouseLngLat: LngLat | null = null;
  hoveredProjectAreaId$ = new Subject<number | null>();

  hoveredProjectArea$: Observable<TreatmentProjectArea | undefined> =
    combineLatest([
      this.treatmentsState.summary$,
      this.hoveredProjectAreaId$.pipe(distinctUntilChanged()),
    ]).pipe(
      map(([summary, projectAreaId]) => {
        return summary?.project_areas.find(
          (p: TreatmentProjectArea) => p.project_area_id === projectAreaId
        );
      })
    );

  constructor(
    private mapConfigState: MapConfigState,
    private authService: AuthService,
    private treatmentsState: TreatmentsState,
    private selectedStandsState: SelectedStandsState,
    private dataLayersStateService: DataLayersStateService,
    private route: ActivatedRoute,
    private router: Router,
    private planState: PlanState
  ) {
    // update cursor on map
    this.mapConfigState.cursor$
      .pipe(untilDestroyed(this))
      .subscribe((cursor) => {
        if (this.mapLibreMap) {
          this.mapLibreMap.getCanvas().style.cursor = cursor;
        }
      });

    combineLatest([
      this.planState.currentPlan$,
      this.treatmentsState.projectAreaId$,
    ])
      .pipe(untilDestroyed(this))
      .subscribe(([plan]) => {
        this.userCanEditStands = plan ? canEditTreatmentPlan(plan) : false;
        if (!this.userCanEditStands) {
          this.mapConfigState.setStandSelectionEnabled(false);
        }
      });

    this.mapConfigState.baseLayer$.pipe(untilDestroyed(this)).subscribe(() => {
      this.selectedStandsState.backUpAndClearSelectedStands();
    });
  }

  afterStandsLoaded() {
    this.selectedStandsState.restoreSelectedStands();
  }

  onMapMouseDown(event: MapMouseEvent): void {
    if (event.originalEvent.button === 2) {
      return;
    }
    if (
      !this.userCanEditStands ||
      !this.mapConfigState.isStandSelectionEnabled()
    ) {
      return;
    }
    this.dragStandsSelection = true;

    this.mouseStart = event;
  }

  mapLoaded(event: MapLibreMap) {
    this.mapLibreMap = event;
    this.mapConfigState.zoomLevel$.next(this.mapLibreMap.getZoom());
    this.listenForZoom();
  }

  listenForZoom() {
    this.mapLibreMap.on('zoom', () => {
      this.mapConfigState.zoomLevel$.next(this.mapLibreMap.getZoom());
    });
  }

  onMapMouseMove(event: MapMouseEvent): void {
    if (
      this.userCanEditStands &&
      this.mapConfigState.isStandSelectionEnabled()
    ) {
      this.treatmentTooltipLngLat = event.lngLat;
    } else {
      this.treatmentTooltipLngLat = null;
    }

    if (!this.dragStandsSelection) return;
    // hide the treatment dialog while dragging
    this.treatmentsState.setShowApplyTreatmentsDialog(false);
    this.mouseEnd = event;
  }

  onMapMouseUp(): void {
    if (!this.dragStandsSelection) return;
    this.dragStandsSelection = false;
    this.mouseStart = null;
    this.mouseEnd = null;
  }

  onMapMouseOut() {
    this.treatmentTooltipLngLat = null;
  }

  openTreatmentLegend() {
    this.mapConfigState.setTreatmentLegendVisible(true);
  }

  handleOpacityChange(opacity: number) {
    this.mapConfigState.setTreatedStandsOpacity(opacity);
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());

  setHoveredProjectAreaId(value: number | null) {
    this.hoveredProjectAreaId$.next(value);
  }

  setMouseLngLat(value: LngLat | null) {
    this.mouseLngLat = value;
  }

  selectProjectArea(projectAreaId: string) {
    this.router
      .navigate(['project-area', projectAreaId], {
        relativeTo: this.route,
      })
      .then(() => {
        this.mapLibreMap.getCanvas().style.cursor = '';
      });
  }
}
