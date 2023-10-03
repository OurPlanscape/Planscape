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
import {
  BehaviorSubject,
  map,
  Observable,
  Subject,
  take,
  takeUntil,
  of,
} from 'rxjs';
import { filter } from 'rxjs/operators';
import * as shp from 'shpjs';

import {
  AuthService,
  MapService,
  PlanService,
  PlanState,
  PopupService,
  SessionService,
} from '../services';
import {
  BoundaryConfig,
  ConditionsConfig,
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

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements AfterViewInit, OnDestroy, OnInit, DoCheck {
  mapManager: MapManager;

  maps: Map[];
  mapViewOptions$ = new BehaviorSubject<MapViewOptions>(
    defaultMapViewOptions()
  );
  mapNameplateWidths: BehaviorSubject<number | null>[] = Array(4)
    .fill(null)
    .map((_) => new BehaviorSubject<number | null>(null));

  boundaryConfig$: Observable<BoundaryConfig[] | null>;
  conditionsConfig$: Observable<ConditionsConfig | null>;
  regionRecord$: string = '';
  selectedRegion$: Observable<Region | null>;
  planState$: Observable<PlanState>;
  selectedMap$: Observable<Map | undefined>;

  existingProjectsGeoJson$ = new BehaviorSubject<GeoJSON.GeoJSON | null>(null);

  loadingIndicators: { [layerName: string]: boolean } = {
    existing_projects: true,
  };

  legend: Legend = LEGEND;

  /** Actions bar variables */
  readonly AreaCreationAction = AreaCreationAction;
  showUploader = false;
  selectedAreaCreationAction: AreaCreationAction = AreaCreationAction.NONE;
  showConfirmAreaButton$ = new BehaviorSubject(false);

  private readonly destroy$ = new Subject<void>();
  login_enabled = this.featureService.isFeatureEnabled('login');
  drawingLayer: L.GeoJSON | undefined;

  @Input() planId: string | null = null;

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
    this.boundaryConfig$ = this.mapService.boundaryConfig$.pipe(
      takeUntil(this.destroy$)
    );
    this.conditionsConfig$ = this.mapService.conditionsConfig$.pipe(
      takeUntil(this.destroy$)
    );
    this.selectedRegion$ = this.sessionService.region$.pipe(
      takeUntil(this.destroy$)
    );
    this.sessionService.mapViewOptions$
      .pipe(take(1))
      .subscribe((mapViewOptions: MapViewOptions | null) => {
        if (mapViewOptions) {
          this.mapViewOptions$.next(mapViewOptions);
        }
      });

    this.planState$ = this.planService.planState$.pipe(
      takeUntil(this.destroy$)
    );

    this.mapService
      .getExistingProjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe((projects: GeoJSON.GeoJSON) => {
        this.existingProjectsGeoJson$.next(projects);
        this.loadingIndicators['existing_projects'] = false;
      });

    this.maps = ['map1', 'map2', 'map3', 'map4'].map(
      (id: string, index: number) => {
        return {
          id: id,
          name: `${index + 1}`,
          config: defaultMapConfig(),
        };
      }
    );

    this.selectedMap$ = this.mapViewOptions$.pipe(
      takeUntil(this.destroy$),
      map((mapViewOptions) => this.maps[mapViewOptions.selectedMapIndex])
    );

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
      .pipe(takeUntil(this.destroy$))
      .subscribe(this.showConfirmAreaButton$);
  }

  ngOnInit(): void {
    this.selectedRegion$.pipe(take(1)).subscribe((region) => {
      this.regionRecord$ = region!;
    });
    this.restoreSession();
    /** Save map configurations in the user's session every X ms. */
    this.sessionService.sessionInterval$
      .pipe(takeUntil(this.destroy$))
      .subscribe((_) => {
        this.sessionService.setMapViewOptions(this.mapViewOptions$.getValue());
        this.sessionService.setMapConfigs(
          this.maps.map((map: Map) => map.config)
        );
      });
  }

  ngDoCheck(): void {
    this.selectedRegion$.pipe(take(1)).subscribe((region) => {
      if (this.regionRecord$ != region) {
        this.regionRecord$ = region!;
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
          this.drawPlanningArea(plan);
        },
        error: (error) => {
          // this.planNotFound = true;
        },
      });
    }
  }

  ngOnDestroy(): void {
    this.maps.forEach((map: Map) => map.instance?.remove());
    this.sessionService.setMapConfigs(this.maps.map((map: Map) => map.config));
    this.destroy$.next();
    this.destroy$.complete();
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

    // Renders the selected region on the map.
    this.selectedRegion$.subscribe((selectedRegion: Region | null) => {
      var centerCoords = regionMapCenters(selectedRegion!);
      map.instance?.setView(new L.LatLng(centerCoords[0], centerCoords[1]));
      // Region highlighting disabled for now
      // this.displayRegionBoundary(map, selectedRegion);
      this.loadPlanAndDrawPlanningArea();
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
    });

    openedDialog.afterClosed().subscribe((result) => {
      if (result) {
        this.createPlan(result.value, this.mapManager.convertToPlanningArea());
      }
    });
  }

  private openSignInDialog() {
    this.dialog.open(SignInDialogComponent, {
      maxWidth: '560px',
    });
  }

  private createPlan(name: string, shape: GeoJSON.GeoJSON) {
    this.selectedRegion$.pipe(take(1)).subscribe((selectedRegion) => {
      if (!selectedRegion) {
        this.matSnackBar.open('[Error] Please select a region!', 'Dismiss', {
          duration: 10000,
          panelClass: ['snackbar-error'],
          verticalPosition: 'top',
        });
        return;
      }

      this.planService
        .createPlan({
          name: name,
          ownerId: 'tempUserId',
          region: selectedRegion,
          planningArea: shape,
        })
        .pipe(take(1))
        .subscribe({
          next: (result) => {
            this.router.navigate(['plan', result.result!.id]);
          },
          error: (e) => {
            this.matSnackBar.open(
              '[Error] Unable to create plan due to backend error.',
              'Dismiss',
              {
                duration: 10000,
                panelClass: ['snackbar-error'],
                verticalPosition: 'top',
              }
            );
          },
        });
    });
  }

  /** Handles the area creation action change. */
  onAreaCreationActionChange(option: AreaCreationAction) {
    const selectedMapIndex = this.mapViewOptions$.getValue().selectedMapIndex;
    this.selectedAreaCreationAction = option;
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
    this.matSnackBar.open('[Error] Not a valid shapefile!', 'Dismiss', {
      duration: 10000,
      panelClass: ['snackbar-error'],
      verticalPosition: 'top',
    });
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

  /** Return the selected map's data layer opacity. */
  getOpacityForSelectedMap(): Observable<number | undefined> {
    var dataLayerConfigOpacityDefined = true;
    this.selectedMap$.pipe(take(1)).subscribe((selectedMap: any) => {
      if (selectedMap?.config.dataLayerConfig.opacity == null) {
        dataLayerConfigOpacityDefined = false;
      }
    });
    if (dataLayerConfigOpacityDefined) {
      return this.selectedMap$.pipe(
        map((selectedMap) => selectedMap?.config.dataLayerConfig.opacity)
      );
    } else {
      return of(this.mapManager.defaultOpacity);
    }
  }

  /** Whether the currently selected map has a data layer active. */
  mapHasDataLayer(): Observable<boolean> {
    return this.selectedMap$.pipe(
      map((selectedMap) => !!selectedMap?.config.dataLayerConfig.layer)
    );
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

  /** Computes the height for the map row at given index (0%, 50%, or 100%).
   *
   *  WARNING: This function is run constantly and shouldn't do any heavy lifting!
   */
  mapRowHeight(index: number): string {
    switch (this.mapViewOptions$.getValue().numVisibleMaps) {
      case 4:
        return '50%';
      case 2:
      case 1:
      default:
        if (
          Math.floor(this.mapViewOptions$.getValue().selectedMapIndex / 2) ===
          index
        ) {
          return '100%';
        }
        return '0%';
    }
  }

  backHome() {
    this.router.navigate(['home']);
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
}
