import * as L from 'leaflet';
import { LatLngTuple } from 'leaflet';

import {
  AfterViewInit,
  ApplicationRef,
  ChangeDetectorRef,
  Component,
  createComponent,
  DoCheck,
  EnvironmentInjector,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Feature, FeatureCollection, Geometry } from 'geojson';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  firstValueFrom,
  map,
  Observable,
  of,
  switchMap,
  take,
} from 'rxjs';
import { filter } from 'rxjs/operators';
import * as shp from 'shpjs';

import {
  AuthService,
  MapService,
  PlanService,
  PlanStateService,
  PopupService,
  SessionService,
  ShareMapService,
} from '@services';
import {
  Legend,
  Map,
  MapConfig,
  MapViewOptions,
  NONE_BOUNDARY_CONFIG,
  Plan,
  Region,
} from '@types';
import { MapManager } from './map-manager';
import { PlanCreateDialogComponent } from './plan-create-dialog/plan-create-dialog.component';
import { ProjectCardComponent } from './project-card/project-card.component';
import { SignInDialogComponent } from './sign-in-dialog/sign-in-dialog.component';
import { AreaCreationAction, LEGEND } from './map.constants';
import { Breadcrumb, SNACK_ERROR_CONFIG } from '@shared';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  addGeoJSONToMap,
  defaultMapConfig,
  defaultMapViewOptions,
  getMapNameplateWidth,
  regionMapCenters,
} from './map.helper';
import { changeMapBaseStyle } from './map.tiles';
import { OutsideRegionDialogComponent } from './outside-region-dialog/outside-region-dialog.component';
import { updateLegendWithColorMap } from './map.legends';
import {
  addRegionLayer,
  createDrawingLayer,
  hideRegionLayer,
  showRegionLayer,
} from './map.layers';
import { getPlanPath } from '../plan/plan-helpers';
import { InvalidLinkDialogComponent } from './invalid-link-dialog/invalid-link-dialog.component';
import { Location } from '@angular/common';
import { LocalStorageService } from '@services/local-storage.service';

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

  conditionsUpdated$ = new BehaviorSubject(false);

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

  mapHasDataLayer$ = combineLatest([
    this.selectedMap$,
    this.conditionsUpdated$,
  ]).pipe(map(([selectedMap]) => !!selectedMap?.config.dataLayerConfig.layer));

  showConfirmAreaButton$ = new BehaviorSubject(false);
  breadcrumbs$ = new BehaviorSubject<Breadcrumb[]>([{ name: 'New Plan' }]);

  totalArea$ = this.showConfirmAreaButton$.asObservable().pipe(
    switchMap((show) => {
      return this.mapManager.edits$.asObservable().pipe(map(() => show));
    }),
    switchMap((show) => {
      const geometry = this.mapManager.convertToPlanningArea();
      if (!show || !geometry) {
        return of(null);
      }

      return this.planService.getTotalArea(geometry);
    }),
    catchError((error) => {
      if (error.status === 413 || error.status === 400) {
        this.mapManager.clearAllDrawings();
        this.showAreaTooComplexError();
      }
      throw error;
    })
  );

  @HostListener('window:beforeunload')
  beforeUnload(): Observable<boolean> | boolean {
    // save map state before leaving page
    this.sessionService.setMapConfigs(this.maps.map((map: Map) => map.config));
    this.sessionService.setMapViewOptions(this.mapViewOptions$.getValue());
    return true;
  }

  constructor(
    public applicationRef: ApplicationRef,
    private authService: AuthService,
    private mapService: MapService,
    private dialog: MatDialog,
    private matSnackBar: MatSnackBar,
    private environmentInjector: EnvironmentInjector,
    private popupService: PopupService,
    private sessionService: SessionService,
    private planStateService: PlanStateService,
    private planService: PlanService,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private shareMapService: ShareMapService,
    private location: Location,
    private localStorageService: LocalStorageService
  ) {
    this.sessionService.mapViewOptions$
      .pipe(take(1))
      .subscribe((mapViewOptions: MapViewOptions | null) => {
        if (mapViewOptions) {
          this.mapViewOptions$.next(mapViewOptions);
        }
      });

    this.mapManager = new MapManager(
      this.matSnackBar,
      this.maps,
      this.mapViewOptions$,
      this.popupService,
      this.sessionService,
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
    const link = this.route.snapshot.queryParams['link'];
    if (link) {
      this.loadMapDataFromLink(link);
    } else {
      this.restoreSession();
    }

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
    const center = this.mapViewOptions$.value.center as LatLngTuple;
    this.maps.forEach((map: Map) => {
      this.initMap(map, map.id, center, this.mapViewOptions$.value.zoom);
    });
    this.mapManager.syncVisibleMaps(this.isMapVisible.bind(this));
  }

  private loadPlanAndDrawPlanningArea() {
    // if planID is provided load planning area
    if (this.planId) {
      const plan$ = this.planStateService.getPlan(this.planId).pipe(take(1));

      plan$.subscribe({
        next: (plan) => {
          if (this.regionRecord != plan.region_name) {
            this.sessionService.setRegion(plan.region_name);
            this.mapService.setConfigs();
          }

          this.drawPlanningArea(plan);
          this.breadcrumbs$.next([
            { name: plan.name, path: getPlanPath(plan.id) },
          ]);
        },
        error: (error) => {
          // this.planNotFound = true;
        },
      });
    }
  }

  private drawPlanningArea(plan: Plan, color?: string, opacity?: number) {
    if (!plan.geometry) return;

    if (!!this.drawingLayer) {
      this.drawingLayer.remove();
    }

    this.maps.forEach((map) => {
      if (map.instance && plan.geometry) {
        this.drawingLayer = createDrawingLayer(plan.geometry, color, opacity);
        addGeoJSONToMap(this.drawingLayer, map.instance);
      }
    });
  }

  ngOnDestroy(): void {
    // save map state before removing this component
    this.maps.forEach((map: Map) => map.instance?.remove());
    this.sessionService.setMapConfigs(this.maps.map((map: Map) => map.config));
  }

  loadMapDataFromLink(link: string) {
    this.shareMapService.getMapDataFromLink(link).subscribe({
      next: (result) => {
        // if the region is different, update it and retrieve configs (boundaries/RRK) again.
        if (result.region !== this.regionRecord) {
          this.regionRecord = result.region;
          this.sessionService.setRegion(result.region);
          this.mapService.setConfigs();
        }
        this.sessionService.setMapConfigs(result.mapConfig, result.region);

        this.sessionService.region$.pipe(take(1)).subscribe((region) => {
          if (result.mapViewOptions) {
            this.changeMapCount(result.mapViewOptions?.numVisibleMaps);
            this.mapViewOptions$.next(result.mapViewOptions);
          }

          result.mapConfig.forEach((mapConfig, index) => {
            this.maps[index].config = mapConfig;
            this.initMap(
              this.maps[index],
              this.maps[index].id,
              result.mapViewOptions!.center,
              this.mapViewOptions$.value.zoom
            );
          });
          this.mapManager.syncVisibleMaps(this.isMapVisible.bind(this));

          this.boundaryConfig$.subscribe((_) =>
            this.updateBoundaryConfigFromMapConfig()
          );

          // pretty bad, but doing this to reload conditions on panels
          this.mapService.conditionsConfig$.next(
            this.mapService.conditionsConfig$.value
          );
          this.cdr.detectChanges();
        });
        this.cdr.detectChanges();
      },
      error: () => {
        this.location.replaceState(location.pathname, '');
        this.dialog.open(InvalidLinkDialogComponent);
      },
    });
  }

  /** we need to find the same config instance from boundaryConfig$ as the one
   * saved in map.config, so the map config panel shows the same right selection.
   * TODO: avoid this, save only the boundary config id or something that we can
   * easily identify rather than the whole object (which drives this issue)
   *
   * ISSUE this is happening with the "old" boundary config.
   * Probably the same happens with the other stuff.
   */
  private updateBoundaryConfigFromMapConfig() {
    this.boundaryConfig$
      .pipe(filter((config) => !!config))
      .subscribe((config) => {
        if (config) {
          if (config[0].region_name != this.regionRecord) {
            return;
          }
        }

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
        this.updateBoundaryConfigFromMapConfig();
      });
    this.cdr.detectChanges();
  }

  /** Initializes the map with controls and the layer options specified in its config. */
  private initMap(map: Map, id: string, center?: L.LatLngTuple, zoom?: number) {
    this.mapManager.initLeafletMap(
      map,
      id,
      this.createDetailCardCallback.bind(this),
      this.getBoundaryLayerVector.bind(this)
    );
    this.loadPlanAndDrawPlanningArea();

    // Renders the selected region on the map.
    this.selectedRegion$
      .pipe(take(1))
      .subscribe((selectedRegion: Region | null) => {
        const centerCoords = center || regionMapCenters(selectedRegion!);
        map.instance?.setView(
          new L.LatLng(centerCoords[0], centerCoords[1]),
          zoom
        );
        // Region highlighting disabled for now
        this.setRegionBoundaryOnMap(map, selectedRegion);
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
    updateLegendWithColorMap(map, map.config.dataLayerConfig.colormap, [
      map.config.dataLayerConfig.min_value,
      map.config.dataLayerConfig.max_value,
    ]);

    // Calculate the maximum width of the map nameplate.
    this.updateMapNameplateWidth(map);
  }

  private updateMapNameplateWidth(map: Map) {
    this.mapNameplateWidths[this.maps.indexOf(map)].next(
      getMapNameplateWidth(map)
    );
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
  async openCreatePlanDialog() {
    if (!this.authService.loggedInStatus$.value) {
      this.openSignInDialog();
      return;
    }
    const selectedMapIndex = this.mapViewOptions$.getValue().selectedMapIndex;
    const regionBoundary = this.maps[
      selectedMapIndex
    ].regionLayerRef?.toGeoJSON() as FeatureCollection;
    if (regionBoundary) {
      const inRegion = this.mapManager.checkIfDrawingInRegion(regionBoundary);

      if (!inRegion) {
        showRegionLayer(this.maps[selectedMapIndex]);
        this.dialog.open(OutsideRegionDialogComponent, { maxWidth: '560px' });
        return;
      }
    }

    const area = (await firstValueFrom(this.totalArea$)) || 0;

    this.openPlanCreateDialog(area)
      .afterClosed()
      .subscribe((id) => {
        if (id) {
          this.router.navigate(['plan', id]);
        }
      });
  }

  private openSignInDialog() {
    return this.dialog.open(SignInDialogComponent, {
      maxWidth: '560px',
    });
  }

  private openPlanCreateDialog(area: number) {
    return this.dialog.open(PlanCreateDialogComponent, {
      maxWidth: '560px',
      data: {
        shape: this.mapManager.convertToPlanningArea(),
        totalArea: area,
      },
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
    showRegionLayer(this.maps[selectedMapIndex]);
  }

  cancelAreaCreationAction() {
    const selectedMapIndex = this.mapViewOptions$.getValue().selectedMapIndex;
    this.mapManager.removeDrawingControl(this.maps[selectedMapIndex].instance!);
    this.mapManager.disablePolygonDrawingTool(
      this.maps[selectedMapIndex].instance!
    );
    this.mapManager.clearAllDrawings();
    hideRegionLayer(this.maps[selectedMapIndex]);
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
          this.addFeaturesToMapIfValid(geojson);
        } else {
          this.showUploadError();
        }
      } catch (e) {
        this.showUploadError();
      }
    }
  }

  private addFeaturesToMapIfValid(geojson: FeatureCollection) {
    this.planService
      .getTotalArea(geojson.features?.[0]?.geometry)
      .pipe(take(1))
      .subscribe({
        next: () => {
          const selectedMapIndex =
            this.mapViewOptions$.getValue().selectedMapIndex;
          this.mapManager.addGeoJsonToDrawing(
            geojson,
            this.maps[selectedMapIndex]
          );
          this.showUploader = false;
          this.addDrawingControlToAllMaps();
        },
        error: () => {
          this.showAreaTooComplexError();
        },
      });
  }

  private showUploadError() {
    this.matSnackBar.open(
      '[Error] Not a valid shapefile!',
      'Dismiss',
      SNACK_ERROR_CONFIG
    );
  }

  private showAreaTooComplexError() {
    this.matSnackBar.open(
      'Your shapefile is too large or complex to process. Please upload a revised shapefile and try again.',
      'Dismiss',
      { ...SNACK_ERROR_CONFIG, duration: 20000 }
    );
  }

  private setRegionBoundaryOnMap(map: Map, selectedRegion: Region | null) {
    if (!selectedRegion) return;
    if (!map.instance) return;
    this.mapService
      .getRegionBoundary(selectedRegion)
      .subscribe((boundary: GeoJSON.GeoJSON) => {
        addRegionLayer(map, boundary);
      });
  }

  /** Toggles which base layer is shown. */
  changeBaseLayer(map: Map) {
    changeMapBaseStyle(map);

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
    this.conditionsUpdated$.next(true);
    updateLegendWithColorMap(map, map.config.dataLayerConfig.colormap, [
      map.config.dataLayerConfig.min_value,
      map.config.dataLayerConfig.max_value,
    ]);
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
      this.mapManager.syncVisibleMaps(this.isMapVisible.bind(this));
      setTimeout(() => {
        this.maps.forEach((map: Map) => {
          map.instance?.invalidateSize();
        });
      }, 0);
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
    this.router.navigate(['home'], {
      queryParams: this.localStorageService.getItem('homeParameters'),
    });
  }
}
