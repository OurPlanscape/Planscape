import * as L from 'leaflet';
import {
  AfterViewInit,
  ApplicationRef,
  Component,
  createComponent,
  EnvironmentInjector,
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
  DoCheck,
  Input,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Feature, Geometry } from 'geojson';
import { BehaviorSubject, map, Observable, take } from 'rxjs';
import { filter } from 'rxjs/operators';
import * as shp from 'shpjs';

import {
  AuthService,
  MapService,
  PlanService,
  PopupService,
  SessionService,
} from '../services';
import {
  DEFAULT_COLORMAP,
  defaultMapConfig,
  defaultMapViewOptions,
  Legend,
  Map,
  MapConfig,
  MapViewOptions,
  NONE_BOUNDARY_CONFIG,
  NONE_COLORMAP,
  Plan,
  Region,
  regionMapCenters,
} from '../types';
import { MapManager } from './map-manager';
import { PlanCreateDialogComponent } from './plan-create-dialog/plan-create-dialog.component';
import { ProjectCardComponent } from './project-card/project-card.component';
import { SignInDialogComponent } from './sign-in-dialog/sign-in-dialog.component';
import { FeatureService } from '../features/feature.service';
import { AreaCreationAction, LEGEND } from './map.constants';
import { SNACK_ERROR_CONFIG } from '../../app/shared/constants';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements AfterViewInit, OnDestroy, OnInit, DoCheck {
  @Input() planId: string | null = null;

  readonly AreaCreationAction = AreaCreationAction;
  readonly legend: Legend = LEGEND;
  readonly login_enabled = this.featureService.isFeatureEnabled('login');
  readonly maps: Map[] = ['map1', 'map2', 'map3', 'map4'].map(
    (id: string, index: number) => {
      return {
        id: id,
        name: `${index + 1}`,
        config: defaultMapConfig(),
      };
    }
  );

  mapManager: MapManager;
  regionRecord: string = '';
  loadingIndicators: { [layerName: string]: boolean } = {
    existing_projects: true,
  };
  selectedAreaCreationAction = AreaCreationAction.NONE;
  showUploader = false;
  drawingLayer: L.GeoJSON | undefined;

  mapViewOptions$ = new BehaviorSubject<MapViewOptions>(
    defaultMapViewOptions()
  );
  mapNameplateWidths = Array(4)
    .fill(null)
    .map((_) => new BehaviorSubject<number | null>(null));

  boundaryConfig$ = this.mapService.boundaryConfig$
    .asObservable()
    .pipe(untilDestroyed(this));
  conditionsConfig$ = this.mapService.conditionsConfig$.asObservable();
  selectedRegion$ = this.sessionService.region$.asObservable();

  selectedMap$ = this.mapViewOptions$.pipe(
    map((options) => this.maps[options.selectedMapIndex])
  );
  selectedMapOpacity$ = this.selectedMap$.pipe(
    map(
      (selectedMap) =>
        selectedMap.config.dataLayerConfig.opacity ||
        this.mapManager.defaultOpacity
    )
  );
  /** Whether the currently selected map has a data layer active. */
  mapHasDataLayer$ = this.selectedMap$.pipe(
    map((selectedMap) => !!selectedMap?.config.dataLayerConfig.layer)
  );
  existingProjectsGeoJson$ = new BehaviorSubject<GeoJSON.GeoJSON | null>(null);
  showConfirmAreaButton$ = new BehaviorSubject(false);
  breadcrumbs$ = new BehaviorSubject(['New Plan']);

  constructor(
    public applicationRef: ApplicationRef,
    private authService: AuthService,
    private mapService: MapService,
    private dialog: MatDialog,
    private matSnackBar: MatSnackBar,
    private environmentInjector: EnvironmentInjector,
    private popupService: PopupService,
    private sessionService: SessionService,
    private planService: PlanService,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private featureService: FeatureService
  ) {
    this.sessionService.mapViewOptions$
      .pipe(take(1))
      .subscribe((mapViewOptions: MapViewOptions | null) => {
        if (mapViewOptions) {
          this.mapViewOptions$.next(mapViewOptions);
        }
      });

    this.mapService
      .getExistingProjects()
      .pipe(untilDestroyed(this))
      .subscribe((projects: GeoJSON.GeoJSON) => {
        this.existingProjectsGeoJson$.next(projects);
        this.loadingIndicators['existing_projects'] = false;
      });

    this.mapManager = new MapManager(
      this.matSnackBar,
      this.maps,
      this.mapViewOptions$,
      this.popupService,
      this.sessionService,
      this.startLoadingLayerCallback.bind(this),
      this.doneLoadingLayerCallback.bind(this),
      this.http
    );
    this.mapManager.polygonsCreated$
      .pipe(untilDestroyed(this))
      .subscribe(this.showConfirmAreaButton$);
  }

  ngOnInit(): void {
    this.selectedRegion$.pipe(take(1)).subscribe((region) => {
      this.regionRecord = region!;
    });
    this.restoreSession();
    /** Save map configurations in the user's session every X ms. */
    this.sessionService.sessionInterval$
      .pipe(untilDestroyed(this))
      .subscribe((_) => {
        this.sessionService.setMapViewOptions(this.mapViewOptions$.getValue());
        this.sessionService.setMapConfigs(
          this.maps.map((map: Map) => map.config)
        );
      });
  }

  ngDoCheck(): void {
    this.selectedRegion$.pipe(take(1)).subscribe((region) => {
      if (this.regionRecord != region) {
        this.regionRecord = region!;
        this.sessionService.mapConfigs$
          .pipe(take(1))
          .subscribe((mapConfigs: Record<Region, MapConfig[]> | null) => {
            if (mapConfigs && region) {
              var regionMaps = mapConfigs[region];
              if (regionMaps) {
                regionMaps.forEach((mapConfig, index) => {
                  this.maps[index].config = mapConfig;
                  this.boundaryConfig$
                    .pipe(filter((config) => !!config))
                    .subscribe((config) => {
                      // Ensure the radio button corresponding to the saved selection is selected.
                      const boundaryConfig = config?.find(
                        (boundary) =>
                          boundary.boundary_name ===
                          mapConfig.boundaryLayerConfig.boundary_name
                      );
                      this.maps[index].config.boundaryLayerConfig =
                        boundaryConfig ? boundaryConfig : NONE_BOUNDARY_CONFIG;
                    });
                });
              }
            }
          });
        this.maps.forEach((map: Map) => {
          this.initMap(map, map.id);
        });
        this.mapManager.syncVisibleMaps(this.isMapVisible.bind(this));
      }
    });
    this.cdr.detectChanges();
  }

  ngAfterViewInit(): void {
    this.maps.forEach((map: Map) => {
      this.initMap(map, map.id);
    });
    this.mapManager.syncVisibleMaps(this.isMapVisible.bind(this));
  }

  private loadPlanAndDrawPlanningArea() {
    // if planID is provided load planning area
    if (this.planId) {
      const plan$ = this.planService.getPlan(this.planId).pipe(take(1));

      plan$.subscribe({
        next: (plan) => {
          if (this.regionRecord != plan.region) {
            this.sessionService.setRegion(plan.region);
            this.mapService.setConfigs();
          }

          this.drawPlanningArea(plan);
          this.breadcrumbs$.next([plan.name]);
        },
        error: (error) => {
          // this.planNotFound = true;
        },
      });
    }
  }

  private drawPlanningArea(plan: Plan, color?: string, opacity?: number) {
    if (!plan.planningArea) return;

    if (!!this.drawingLayer) {
      this.drawingLayer.remove();
    }

    this.maps.forEach((map) => {
      if (map.instance) {
        this.drawingLayer = L.geoJSON(plan.planningArea, {
          pane: 'overlayPane',
          style: {
            color: color ?? '#3367D6',
            fillColor: color ?? '#3367D6',
            fillOpacity: opacity ?? 0.1,
            weight: 7,
          },
        }).addTo(map.instance);
        map.instance.fitBounds(this.drawingLayer.getBounds());
        map.instance.invalidateSize();
      }
    });
  }

  ngOnDestroy(): void {
    this.maps.forEach((map: Map) => map.instance?.remove());
    this.sessionService.setMapConfigs(this.maps.map((map: Map) => map.config));
  }

  private restoreSession() {
    this.sessionService.mapViewOptions$
      .pipe(take(1))
      .subscribe((mapViewOptions: MapViewOptions | null) => {
        if (mapViewOptions) {
          this.mapViewOptions$.next(mapViewOptions);
        }
      });
    this.sessionService.mapConfigs$
      .pipe(take(1))
      .subscribe((mapConfigs: Record<Region, MapConfig[]> | null) => {
        this.selectedRegion$
          .pipe(take(1))
          .subscribe((region: Region | null) => {
            if (mapConfigs && region) {
              var regionMaps = mapConfigs[region];
              if (regionMaps) {
                regionMaps.forEach((mapConfig, index) => {
                  this.maps[index].config = mapConfig;
                });
              }
            }
          });
        this.boundaryConfig$
          .pipe(filter((config) => !!config))
          .subscribe((config) => {
            // Ensure the radio button corresponding to the saved selection is selected.
            this.maps.forEach((map) => {
              const boundaryConfig = config?.find(
                (boundary) =>
                  boundary.boundary_name ===
                  map.config.boundaryLayerConfig.boundary_name
              );
              map.config.boundaryLayerConfig = boundaryConfig
                ? boundaryConfig
                : NONE_BOUNDARY_CONFIG;
            });
          });
      });
    this.cdr.detectChanges();
  }

  /** Initializes the map with controls and the layer options specified in its config. */
  private initMap(map: Map, id: string) {
    this.mapManager.initLeafletMap(
      map,
      id,
      this.existingProjectsGeoJson$,
      this.createDetailCardCallback.bind(this),
      this.getBoundaryLayerVector.bind(this)
    );
    this.loadPlanAndDrawPlanningArea();

    // Renders the selected region on the map.
    this.selectedRegion$
      .pipe(untilDestroyed(this))
      .subscribe((selectedRegion: Region | null) => {
        var centerCoords = regionMapCenters(selectedRegion!);
        map.instance?.setView(new L.LatLng(centerCoords[0], centerCoords[1]));
        // Region highlighting disabled for now
        // this.displayRegionBoundary(map, selectedRegion);
      });

    this.showConfirmAreaButton$.subscribe((value: boolean) => {
      if (
        !value &&
        this.selectedAreaCreationAction === AreaCreationAction.UPLOAD
      ) {
        const selectedMapIndex =
          this.mapViewOptions$.getValue().selectedMapIndex;
        this.mapManager.removeDrawingControl(
          this.maps[selectedMapIndex].instance!
        );
        this.showUploader = true;
      }
    });

    // Mark the map as selected when the user clicks anywhere on it.
    map.instance?.addEventListener('click', () => {
      this.selectMap(this.maps.indexOf(map));
    });

    // Initialize the legend with colormap values.
    this.updateLegendWithColormap(map, map.config.dataLayerConfig.colormap, [
      map.config.dataLayerConfig.min_value,
      map.config.dataLayerConfig.max_value,
    ]);

    // Calculate the maximum width of the map nameplate.
    this.updateMapNameplateWidth(map);
  }

  private updateMapNameplateWidth(map: Map) {
    this.mapNameplateWidths[this.maps.indexOf(map)].next(
      this.getMapNameplateWidth(map)
    );
  }

  private getMapNameplateWidth(map: Map): number | null {
    const mapElement = document.getElementById(map.id);
    const attribution = mapElement
      ?.getElementsByClassName('leaflet-control-attribution')
      ?.item(0);
    const mapWidth = !!mapElement ? mapElement.clientWidth : null;
    const attributionWidth = !!attribution ? attribution.clientWidth : null;
    // The maximum width of the nameplate is equal to the width of the map minus the width
    // of Leaflet's attribution control. Additional padding/margins may be applied in the
    // nameplate component, but are not considered for this width.
    const nameplateWidth =
      !!mapWidth && !!attributionWidth ? mapWidth - attributionWidth : null;
    return nameplateWidth;
  }

  private startLoadingLayerCallback(layerName: string) {
    this.loadingIndicators[layerName] = true;
  }

  private doneLoadingLayerCallback(layerName: string) {
    this.loadingIndicators[layerName] = false;
  }

  private createDetailCardCallback(
    features: Feature<Geometry, any>[],
    onInitialized: () => void
  ): any {
    let component = createComponent(ProjectCardComponent, {
      environmentInjector: this.environmentInjector,
    });
    component.instance.initializedEvent.subscribe((_) => onInitialized());
    component.instance.features = features;
    this.applicationRef.attachView(component.hostView);
    return component.location.nativeElement;
  }

  private getBoundaryLayerVector(vectorName: string): Observable<L.Layer> {
    return this.mapService.getBoundaryShapes(vectorName);
  }

  /** If the user is signed in, configures and opens the Create Plan dialog.
   *  If the user is signed out, configure and open the Sign In dialog.
   */
  openCreatePlanDialog() {
    if (!this.authService.loggedInStatus$.value) {
      this.openSignInDialog();
      return;
    }

    const openedDialog = this.dialog.open(PlanCreateDialogComponent, {
      maxWidth: '560px',
      data: {
        shape: this.mapManager.convertToPlanningArea(),
      },
    });

    openedDialog.afterClosed().subscribe((id) => {
      if (id) {
        this.router.navigate(['plan', id]);
      }
    });
  }

  private openSignInDialog() {
    this.dialog.open(SignInDialogComponent, {
      maxWidth: '560px',
    });
  }

  /** Handles the area creation action change. */
  onAreaCreationActionChange(option: AreaCreationAction) {
    const selectedMapIndex = this.mapViewOptions$.getValue().selectedMapIndex;
    this.selectedAreaCreationAction = option;

    if (!this.authService.loggedInStatus$.value) {
      this.cancelAreaCreationAction();
      this.openSignInDialog();
      return;
    }

    if (option === AreaCreationAction.DRAW) {
      this.addDrawingControlToAllMaps();
      this.mapManager.enablePolygonDrawingTool(
        this.maps[selectedMapIndex].instance!
      );
      this.showUploader = false;
      this.changeMapCount(1);
    }
    if (option === AreaCreationAction.UPLOAD) {
      if (!this.showConfirmAreaButton$.value) {
        this.maps[selectedMapIndex].instance!.pm.removeControls();
      }
      this.mapManager.disablePolygonDrawingTool(
        this.maps[selectedMapIndex].instance!
      );
      this.showUploader = !this.showUploader;
    }
  }

  cancelAreaCreationAction() {
    const selectedMapIndex = this.mapViewOptions$.getValue().selectedMapIndex;
    this.mapManager.removeDrawingControl(this.maps[selectedMapIndex].instance!);
    this.mapManager.disablePolygonDrawingTool(
      this.maps[selectedMapIndex].instance!
    );
    this.mapManager.clearAllDrawings();
    this.selectedAreaCreationAction = AreaCreationAction.NONE;
    this.showUploader = false;
  }

  private addDrawingControlToAllMaps() {
    this.maps.forEach((map: Map) => {
      const selectedMapIndex = this.mapViewOptions$.getValue().selectedMapIndex;
      // Only add drawing controls to the selected map
      if (selectedMapIndex === this.maps.indexOf(map)) {
        this.mapManager.addDrawingControl(
          this.maps[selectedMapIndex].instance!
        );
      } else {
        // Show a copy of the drawing layer on the other maps
        this.mapManager.showClonedDrawing(map);
      }
    });
  }

  /** Converts and adds the editable shapefile to the map. */
  async loadArea(event: { type: string; value: File }) {
    const file = event.value;
    if (file) {
      const reader = new FileReader();
      const fileAsArrayBuffer: ArrayBuffer = await new Promise((resolve) => {
        reader.onload = () => {
          resolve(reader.result as ArrayBuffer);
        };
        reader.readAsArrayBuffer(file);
      });
      try {
        const geojson = (await shp.parseZip(
          fileAsArrayBuffer
        )) as GeoJSON.GeoJSON;
        if (geojson.type == 'FeatureCollection') {
          this.mapManager.addGeoJsonToDrawing(geojson);
          this.showUploader = false;
          this.addDrawingControlToAllMaps();
        } else {
          this.showUploadError();
        }
      } catch (e) {
        this.showUploadError();
      }
    }
  }

  private showUploadError() {
    this.matSnackBar.open(
      '[Error] Not a valid shapefile!',
      'Dismiss',
      SNACK_ERROR_CONFIG
    );
  }

  /** Toggles which base layer is shown. */
  changeBaseLayer(map: Map) {
    this.mapManager.changeBaseLayer(map);

    // Changing the base layer may change the attribution, so the map nameplate
    // width should be recalculated.
    this.updateMapNameplateWidth(map);
  }

  /** Toggles which boundary layer is shown. */
  toggleBoundaryLayer(map: Map) {
    this.mapManager.toggleBoundaryLayer(
      map,
      this.getBoundaryLayerVector.bind(this)
    );
  }

  /** Toggles whether existing projects from CalMapper are shown. */
  toggleExistingProjectsLayer(map: Map) {
    this.mapManager.toggleExistingProjectsLayer(map);
  }

  /** Changes which condition scores layer (if any) is shown. */
  changeConditionsLayer(map: Map) {
    this.mapManager.changeConditionsLayer(map);
    this.updateLegendWithColormap(map, map.config.dataLayerConfig.colormap, [
      map.config.dataLayerConfig.min_value,
      map.config.dataLayerConfig.max_value,
    ]);
  }

  private updateLegendWithColormap(
    map: Map,
    colormap?: string,
    minMaxValues?: (number | undefined)[]
  ) {
    if (colormap == undefined) {
      colormap = DEFAULT_COLORMAP;
    } else if (colormap == NONE_COLORMAP) {
      map.legend = undefined;
      return;
    }
  }

  /** Change the opacity of the currently shown data layer on all maps (if any). */
  changeOpacity(opacity: number) {
    this.mapManager.defaultOpacity = opacity;
    this.maps.forEach((map: Map) => {
      map.config.dataLayerConfig.opacity = opacity;
      this.mapManager.changeOpacity(map);
    });
  }

  /** Change how many maps are displayed in the viewport. */
  changeMapCount(mapCount: number) {
    const mapViewOptions = this.mapViewOptions$.getValue();
    mapViewOptions.numVisibleMaps = mapCount;
    this.mapViewOptions$.next(mapViewOptions);

    this.mapManager.syncVisibleMaps(this.isMapVisible.bind(this));
    setTimeout(() => {
      this.maps.forEach((map: Map) => {
        map.instance?.invalidateSize();
        if (this.drawingLayer && this.maps[0].instance) {
          this.maps[0].instance.fitBounds(this.drawingLayer.getBounds());
        }
        // Recalculate the map nameplate size.
        this.updateMapNameplateWidth(map);
      });
    }, 0);
  }

  /** Select a map and update which map contains the drawing layer. */
  selectMap(mapIndex: number) {
    const mapViewOptions = this.mapViewOptions$.getValue();
    const previousMapIndex = mapViewOptions.selectedMapIndex;

    if (previousMapIndex !== mapIndex) {
      mapViewOptions.selectedMapIndex = mapIndex;
      this.mapViewOptions$.next(mapViewOptions);
      this.sessionService.setMapViewOptions(mapViewOptions);

      // Toggle the cloned layer on if the map is not the current selected map.
      // Toggle on the drawing layer and control on the selected map.
      if (
        this.selectedAreaCreationAction === AreaCreationAction.DRAW ||
        this.showConfirmAreaButton$.value
      ) {
        this.mapManager.disablePolygonDrawingTool(
          this.maps[previousMapIndex].instance!
        );
        this.mapManager.removeDrawingControl(
          this.maps[previousMapIndex].instance!
        );
        this.mapManager.showClonedDrawing(this.maps[previousMapIndex]);
        this.mapManager.addDrawingControl(this.maps[mapIndex].instance!);
        this.mapManager.hideClonedDrawing(this.maps[mapIndex]);
      }
    }
  }

  /**
   * Whether the map at given index should be visible.
   *
   *  WARNING: This function is run constantly and shouldn't do any heavy lifting!
   */
  isMapVisible(index: number): boolean {
    if (index === this.mapViewOptions$.getValue().selectedMapIndex) return true;

    switch (this.mapViewOptions$.getValue().numVisibleMaps) {
      case 4:
        return true;
      case 1:
        // Only 1 map is visible and this one is not selected
        return false;
      case 2:
      default:
        // In 2 map view, if the 1st or 2nd map are selected, show maps 1 and 2
        // Otherwise, show maps 3 and 4
        // TODO: 2 map view might go away or the logic here might change
        return (
          Math.floor(this.mapViewOptions$.getValue().selectedMapIndex / 2) ===
          Math.floor(index / 2)
        );
    }
  }

  backHome() {
    this.router.navigate(['home']);
  }
}
