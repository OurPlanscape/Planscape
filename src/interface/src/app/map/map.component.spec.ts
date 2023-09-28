import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ApplicationRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
  ComponentFixture,
  fakeAsync,
  flush,
  TestBed,
  tick,
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { featureCollection, point } from '@turf/helpers';
import * as L from 'leaflet';
import 'leaflet.vectorgrid';
import { BehaviorSubject, of } from 'rxjs';
import * as shp from 'shpjs';

import { MaterialModule } from '../material/material.module';
import {
  AuthService,
  MapService,
  PlanService,
  PlanState,
  SessionService,
} from '../services';
import {
  BaseLayerType,
  BoundaryConfig,
  ConditionsConfig,
  defaultMapConfig,
  defaultMapViewOptions,
  defaultMapConfigsDictionary,
  Map,
  MapConfig,
  MapViewOptions,
  Plan,
  Region,
} from './../types';
import { MapManager } from './map-manager';
import { MapComponent } from './map.component';
import { PlanCreateDialogComponent } from './plan-create-dialog/plan-create-dialog.component';
import { ProjectCardComponent } from './project-card/project-card.component';
import { SignInDialogComponent } from './sign-in-dialog/sign-in-dialog.component';
import { FeaturesModule } from '../features/features.module';

describe('MapComponent', () => {
  let component: MapComponent;
  let mapManager: MapManager;
  let fixture: ComponentFixture<MapComponent>;
  let loader: HarnessLoader;
  let sessionInterval = new BehaviorSubject<number>(0);
  let userSignedIn$ = new BehaviorSubject<boolean | null>(false);

  beforeEach(() => {
    const fakeLayer: L.Layer = L.vectorGrid.protobuf(
      'https://dev-geo.planscape.org/geoserver/gwc/service/tms/1.0.0/sierra-nevada:vector_huc12@EPSG%3A3857@pbf/{z}/{x}/{-y}.pbf',
      {}
    );
    const fakeGeoJson: GeoJSON.GeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [10, 20],
                  [10, 30],
                  [15, 15],
                ],
              ],
            ],
          },
          properties: {
            shape_name: 'Test',
          },
        },
      ],
    };
    const fakePlan: Plan = {
      id: 'temp',
      name: 'somePlan',
      ownerId: 'owner',
      region: Region.SIERRA_NEVADA,
      planningArea: fakeGeoJson,
    };
    const fakeAuthService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      {},
      {
        loggedInStatus$: userSignedIn$,
      }
    );
    const fakeMapService = jasmine.createSpyObj<MapService>(
      'MapService',
      {
        getExistingProjects: of(fakeGeoJson),
        getRegionBoundary: of(fakeGeoJson),
        getBoundaryShapes: of(fakeLayer),
      },
      {
        boundaryConfig$: new BehaviorSubject<BoundaryConfig[] | null>([
          {
            boundary_name: 'HUC-12',
            vector_name: 'sierra-nevada:vector_huc12',
            shape_name: 'Name',
          },
        ]),
        conditionsConfig$: new BehaviorSubject<ConditionsConfig | null>({
          pillars: [
            {
              display: true,
              elements: [
                {
                  display: true,
                  metrics: [
                    {
                      metric_name: 'test_metric_1',
                      layer: 'test_metric_1',
                    },
                  ],
                },
              ],
            },
          ],
        }),
      }
    );
    const fakePlanService = jasmine.createSpyObj<PlanService>(
      'PlanService',
      { createPlan: of({ success: true, result: fakePlan }) },
      {
        planState$: new BehaviorSubject<PlanState>({
          all: {}, // All plans indexed by id
          currentPlanId: 'temp',
          currentScenarioId: null,
          currentConfigId: null,
          mapConditionLayer: null,
          mapShapes: null,
          legendUnits: null,
        }),
      }
    );
    const fakeSessionService = jasmine.createSpyObj<SessionService>(
      'SessionService',
      ['setMapConfigs', 'setMapViewOptions'],
      {
        mapViewOptions$: new BehaviorSubject<MapViewOptions | null>(null),
        mapConfigs$: new BehaviorSubject<Record<Region, MapConfig[]> | null>(
          defaultMapConfigsDictionary()
        ),
        region$: new BehaviorSubject<Region | null>(Region.SIERRA_NEVADA),
        sessionInterval$: sessionInterval,
      }
    );
    const fakeMatDialog = jasmine.createSpyObj<MatDialog>(
      'MatDialog',
      {
        open: {
          afterClosed: () =>
            of({
              value: 'test name',
            }),
        } as MatDialogRef<any>,
      },
      {}
    );
    const routerStub = () => ({ navigate: (array: string[]) => ({}) });
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MaterialModule,
        BrowserAnimationsModule,
        HttpClientTestingModule,
        FeaturesModule,
      ],
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [
        MapComponent,
        ProjectCardComponent,
        PlanCreateDialogComponent,
      ],
      providers: [
        { provide: AuthService, useValue: fakeAuthService },
        { provide: MatDialog, useValue: fakeMatDialog },
        { provide: MapService, useValue: fakeMapService },
        { provide: PlanService, useValue: fakePlanService },
        { provide: SessionService, useValue: fakeSessionService },
        { provide: Router, useFactory: routerStub },
      ],
    });
    fixture = TestBed.createComponent(MapComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);
    component = fixture.componentInstance;
    mapManager = component.mapManager;
    fixture.detectChanges();
  });

  it('can load instance', () => {
    expect(component).toBeTruthy();
  });

  describe('Map initialization', () => {
    it('initializes 4 maps with default config options', () => {
      expect(component.maps.length).toEqual(4);
      component.maps.forEach((map: Map) => {
        expect(map.config).toEqual(defaultMapConfig());
      });
    });

    it('calls the MapService for geojson', () => {
      const mapServiceStub: MapService =
        fixture.debugElement.injector.get(MapService);

      // Region highlighting temporarily disabled.
      // expect(mapServiceStub.getRegionBoundary).toHaveBeenCalledWith(
      //   Region.SIERRA_NEVADA
      // );
      expect(mapServiceStub.getExistingProjects).toHaveBeenCalled();
    });
  });

  describe('ngAfterViewInit', () => {
    it('initializes the leaflet maps', () => {
      component.ngAfterViewInit();

      component.maps.forEach((map: Map) => {
        expect(map.instance).toBeDefined();
        expect(map.baseLayerRef).toBeDefined();
        expect(map.existingProjectsLayerRef).toBeDefined();
      });
    });
  });

  describe('Map selection', () => {
    it('first map is selected by default', () => {
      expect(component.mapViewOptions$.getValue().selectedMapIndex).toBe(0);
    });

    it('can select another map', () => {
      component.ngAfterViewInit();

      // Clicking the initialized map should select it
      component.maps[2].instance?.fireEvent('click');

      expect(component.mapViewOptions$.getValue().selectedMapIndex).toBe(2);
    });

    it('selected map is always visible', () => {
      [0, 1, 2, 3].forEach((selectedMapIndex: number) => {
        component.mapViewOptions$.getValue().selectedMapIndex =
          selectedMapIndex;
        [1, 2, 4].forEach((mapCount: number) => {
          component.mapViewOptions$.getValue().numVisibleMaps = mapCount;

          expect(
            component.isMapVisible(
              component.mapViewOptions$.getValue().selectedMapIndex
            )
          ).toBeTrue();
        });
      });
    });

    it('all maps are visible in 4-map view', () => {
      component.mapViewOptions$.getValue().numVisibleMaps = 4;

      [0, 1, 2, 3].forEach((mapIndex: number) => {
        expect(component.isMapVisible(mapIndex)).toBeTrue();
      });
    });

    it('only selected map is visible in 1-map view', () => {
      component.mapViewOptions$.getValue().numVisibleMaps = 1;

      [0, 1, 2, 3].forEach((selectedMapIndex: number) => {
        component.mapViewOptions$.getValue().selectedMapIndex =
          selectedMapIndex;
        [0, 1, 2, 3].forEach((mapIndex: number) => {
          if (selectedMapIndex === mapIndex) {
            expect(component.isMapVisible(mapIndex)).toBeTrue();
          } else {
            expect(component.isMapVisible(mapIndex)).toBeFalse();
          }
        });
      });
    });

    it('row containing selected map height is 100% in 1-map view', () => {
      component.mapViewOptions$.getValue().numVisibleMaps = 1;

      [0, 1].forEach((selectedMapIndex: number) => {
        component.mapViewOptions$.getValue().selectedMapIndex =
          selectedMapIndex;

        expect(component.mapRowHeight(0)).toEqual('100%');
        expect(component.mapRowHeight(1)).toEqual('0%');
      });

      [2, 3].forEach((selectedMapIndex: number) => {
        component.mapViewOptions$.getValue().selectedMapIndex =
          selectedMapIndex;

        expect(component.mapRowHeight(0)).toEqual('0%');
        expect(component.mapRowHeight(1)).toEqual('100%');
      });
    });

    it('row containing selected map height is 100% in 2-map view', () => {
      component.mapViewOptions$.getValue().numVisibleMaps = 2;

      [0, 1].forEach((selectedMapIndex: number) => {
        component.mapViewOptions$.getValue().selectedMapIndex =
          selectedMapIndex;

        expect(component.mapRowHeight(0)).toEqual('100%');
        expect(component.mapRowHeight(1)).toEqual('0%');
      });

      [2, 3].forEach((selectedMapIndex: number) => {
        component.mapViewOptions$.getValue().selectedMapIndex =
          selectedMapIndex;

        expect(component.mapRowHeight(0)).toEqual('0%');
        expect(component.mapRowHeight(1)).toEqual('100%');
      });
    });

    it('all row heights are 50% in 4-map view', () => {
      component.mapViewOptions$.getValue().numVisibleMaps = 4;

      [0, 1].forEach((mapRowIndex: number) => {
        expect(component.mapRowHeight(mapRowIndex)).toEqual('50%');
      });
    });

    it('enables drawing on selected map and shows cloned layer on other maps', fakeAsync(async () => {
      component.ngAfterViewInit();
      spyOn(component, 'onAreaCreationActionChange').and.callThrough();
      const button = await loader.getHarness(
        MatButtonHarness.with({
          selector: '.draw-area-button',
        })
      );
      await button.click();
      tick();
      component.maps[3].instance?.fireEvent('click');

      expect(component.mapViewOptions$.getValue().selectedMapIndex).toBe(3);
      [0, 1, 2, 3].forEach((mapIndex: number) => {
        if (
          component.mapViewOptions$.getValue().selectedMapIndex === mapIndex
        ) {
          expect(
            component.maps[mapIndex].instance?.hasLayer(mapManager.drawingLayer)
          ).toBeTrue();
          expect(
            component.maps[mapIndex].instance?.hasLayer(
              component.maps[mapIndex].clonedDrawingRef!
            )
          ).toBeFalse();
        } else {
          expect(
            component.maps[mapIndex].instance?.hasLayer(mapManager.drawingLayer)
          ).toBeFalse();
          expect(
            component.maps[mapIndex].instance?.hasLayer(
              component.maps[mapIndex].clonedDrawingRef!
            )
          ).toBeTrue();
        }
      });
      flush();
    }));
  });

  describe('Layer controls', () => {
    const testCases = [0, 1, 2, 3];

    beforeEach(() => {
      component.ngAfterViewInit();
    });

    testCases.forEach((testCase) => {
      describe(`map-${testCase + 1} should toggle layers`, () => {
        it(`map-${testCase + 1} should change base layer`, () => {
          let map = component.maps[testCase];

          map.config.baseLayerType = BaseLayerType.Terrain;
          component.changeBaseLayer(map);

          // Assert: expect that the map contains the terrain base layer
          expect(map.instance?.hasLayer(map.baseLayerRef!)).toBeTrue();
        });

        it(`map-${testCase + 1} should toggle boundary layer`, () => {
          let map = component.maps[testCase];
          expect(map.boundaryLayerRef).toBeUndefined();

          // Act: select the HUC-12 boundary
          map.config.boundaryLayerConfig = {
            boundary_name: 'HUC-12',
            vector_name: 'sierra-nevada:vector_huc12',
            shape_name: 'Name',
          };
          component.toggleBoundaryLayer(map);

          // Assert: expect that the map contains the HUC-12 layer
          expect(map.boundaryLayerRef).toBeDefined();
          expect(map.instance?.hasLayer(map.boundaryLayerRef!)).toBeTrue();
        });

        it(`map-${testCase + 1} should toggle existing projects layer`, () => {
          let map = component.maps[testCase];

          // Act: toggle on existing projects
          map.config.showExistingProjectsLayer = true;
          component.toggleExistingProjectsLayer(map);

          // Assert: expect that the map adds the existing projects layer
          expect(
            map.instance?.hasLayer(map.existingProjectsLayerRef!)
          ).toBeTrue();

          // Act: toggle off existing projects
          map.config.showExistingProjectsLayer = false;
          component.toggleExistingProjectsLayer(map);

          // Assert: expect that the map removes the existing projects layer
          expect(
            map.instance?.hasLayer(map.existingProjectsLayerRef!)
          ).toBeFalse();
        });

        it(`map-${testCase + 1} should change conditions layer`, () => {
          let map = component.maps[testCase];

          // Act: select test metric 1
          map.config.dataLayerConfig.layer = 'test_metric_1';
          component.changeConditionsLayer(map);

          // Assert: expect that the map contains test metric 1
          expect(map.dataLayerRef).toBeDefined();
          expect(map.instance?.hasLayer(map.dataLayerRef!)).toBeTrue();
        });
      });
    });
  });

  describe('Draw an area', () => {
    const drawnPolygon = new L.Polygon([
      [new L.LatLng(38.715517043571914, -120.42857302225725)],
      [new L.LatLng(38.47079787227401, -120.5164425608172)],
      [new L.LatLng(38.52668443555346, -120.11828371421737)],
    ]);
    const TEST_ID = '1';
    (drawnPolygon as any)._leaflet_id = TEST_ID;

    beforeEach(() => {
      component.ngAfterViewInit();
    });

    it('sets up drawing', fakeAsync(async () => {
      spyOn(component, 'onAreaCreationActionChange').and.callThrough();
      const button = await loader.getHarness(
        MatButtonHarness.with({
          selector: '.draw-area-button',
        })
      );

      await button.click();
      tick();
      const selectedMap =
        component.maps[component.mapViewOptions$.getValue().selectedMapIndex];

      component.maps.forEach((map: Map) => {
        expect(map.clonedDrawingRef).toBeDefined();
        expect(map.drawnPolygonLookup).toEqual({});
      });
      expect(
        selectedMap.instance?.hasLayer(selectedMap.clonedDrawingRef!)
      ).toBeFalse();
      expect(
        selectedMap.instance?.hasLayer(mapManager.drawingLayer)
      ).toBeTrue();
    }));

    it('enables polygon tool when drawing option is selected', fakeAsync(async () => {
      spyOn(component, 'onAreaCreationActionChange').and.callThrough();
      const button = await loader.getHarness(
        MatButtonHarness.with({
          selector: '.draw-area-button',
        })
      );

      await button.click();
      tick();
      expect(component.onAreaCreationActionChange).toHaveBeenCalled();
      expect(
        component.maps[
          component.mapViewOptions$.getValue().selectedMapIndex
        ].instance?.hasLayer(mapManager.drawingLayer)
      ).toBeTrue();
    }));

    it('mirrors drawn polygon in all maps', () => {
      const selectedMap =
        component.maps[component.mapViewOptions$.getValue().selectedMapIndex];
      selectedMap.instance?.fire('pm:create', {
        shape: 'Polygon',
        layer: drawnPolygon,
      });

      [0, 1, 2, 3].forEach((mapIndex: number) => {
        expect(
          TEST_ID in component.maps[mapIndex].drawnPolygonLookup!
        ).toBeTrue();
        const clonedLayer =
          component.maps[mapIndex].drawnPolygonLookup![TEST_ID];
        expect(
          component.maps[mapIndex].clonedDrawingRef?.hasLayer(clonedLayer)
        ).toBeTrue();
        expect(
          component.maps[mapIndex].clonedDrawingRef?.getLayers().length
        ).toEqual(1);
      });
    });

    it('removes deleted polygon from all maps', () => {
      const selectedMap =
        component.maps[component.mapViewOptions$.getValue().selectedMapIndex];
      selectedMap.instance?.fire('pm:create', {
        shape: 'Polygon',
        layer: drawnPolygon,
      });

      selectedMap.instance?.fire('pm:remove', {
        shape: 'Polygon',
        layer: drawnPolygon,
      });

      [0, 1, 2, 3].forEach((mapIndex: number) => {
        expect(
          TEST_ID in component.maps[mapIndex].drawnPolygonLookup!
        ).toBeFalse();
        expect(
          component.maps[mapIndex].clonedDrawingRef?.getLayers().length
        ).toEqual(0);
      });
    });

    it('tracks whether the drawing tool is active', () => {
      const selectedMap =
        component.maps[component.mapViewOptions$.getValue().selectedMapIndex];
      expect(mapManager.isInDrawingMode).toBeFalse();

      selectedMap.instance?.fire('pm:drawstart', {
        shape: 'Polygon',
        workingLayer: mapManager.drawingLayer,
      });

      expect(mapManager.isInDrawingMode).toBeTrue();

      selectedMap.instance?.fire('pm:drawend');

      expect(mapManager.isInDrawingMode).toBeFalse();
    });
  });

  describe('Upload an area', () => {
    function createSpy(mockReader: jasmine.SpyObj<FileReader>) {
      spyOn(window as any, 'FileReader').and.returnValue(mockReader);
    }

    beforeEach(() => {
      component.ngAfterViewInit();
    });

    it('upload area button opens the file uploader', async () => {
      const button = await loader.getHarness(
        MatButtonHarness.with({
          selector: '.upload-area-button',
        })
      );

      await button.click();

      expect(component.showUploader).toBeTrue();
    });

    it('adds the geojson to the map given a valid shapefile', async () => {
      const testFile = new File([], 'test.zip');
      const fakeResult = featureCollection([point([-75.343, 39.984])]);
      const mockReader = jasmine.createSpyObj('FileReader', [
        'readAsArrayBuffer',
        'onload',
      ]);
      mockReader.result = 'test content';
      mockReader.readAsArrayBuffer.and.callFake(() => mockReader.onload());
      createSpy(mockReader);
      spyOn(shp, 'parseZip').and.returnValue(Promise.resolve(fakeResult));
      spyOn(mapManager, 'addGeoJsonToDrawing').and.stub();

      await component.loadArea({ type: 'area_upload', value: testFile });

      expect(mapManager.addGeoJsonToDrawing).toHaveBeenCalled();
      expect(component.showUploader).toBeFalse();
    });

    it('shows error when the file is invalid', async () => {
      const testFile = new File([], 'test.zip');
      const mockReader = jasmine.createSpyObj('FileReader', [
        'readAsArrayBuffer',
        'onload',
      ]);
      mockReader.result = 'test content';
      mockReader.readAsArrayBuffer.and.callFake(() => mockReader.onload());
      createSpy(mockReader);
      spyOn(shp, 'parseZip').and.returnValue(Promise.reject());
      spyOn(mapManager, 'addGeoJsonToDrawing').and.stub();
      spyOn(component as any, 'showUploadError').and.callThrough();

      await component.loadArea({ type: 'area_upload', value: testFile });

      expect(mapManager.addGeoJsonToDrawing).not.toHaveBeenCalled();
      expect((component as any).showUploadError).toHaveBeenCalled();
    });
  });

  describe('Create plan', () => {
    it('if user is signed out, opens sign in dialog', fakeAsync(async () => {
      userSignedIn$.next(false);
      const fakeMatDialog: MatDialog =
        fixture.debugElement.injector.get(MatDialog);

      component.selectedAreaCreationAction = component.AreaCreationAction.DRAW;
      fixture.componentInstance.showConfirmAreaButton$ =
        new BehaviorSubject<boolean>(true);
      const button = await loader.getHarness(
        MatButtonHarness.with({
          selector: '.done-button',
        })
      );

      await button.click();
      tick();

      expect(fakeMatDialog.open).toHaveBeenCalledOnceWith(
        SignInDialogComponent,
        { maxWidth: '560px' }
      );
    }));

    it('if user is signed in, opens create plan dialog', fakeAsync(async () => {
      userSignedIn$.next(true);
      const fakeMatDialog: MatDialog =
        fixture.debugElement.injector.get(MatDialog);
      const planServiceStub: PlanService =
        fixture.debugElement.injector.get(PlanService);
      component.selectedAreaCreationAction = component.AreaCreationAction.DRAW;
      fixture.componentInstance.showConfirmAreaButton$ =
        new BehaviorSubject<boolean>(true);
      const button = await loader.getHarness(
        MatButtonHarness.with({
          selector: '.done-button',
        })
      );

      await button.click();
      tick();

      expect(fakeMatDialog.open).toHaveBeenCalledOnceWith(
        PlanCreateDialogComponent,
        { maxWidth: '560px' }
      );
      expect(planServiceStub.createPlan).toHaveBeenCalled();
    }));

    it('dialog calls create plan with name and planning area', fakeAsync(async () => {
      userSignedIn$.next(true);
      const planServiceStub: PlanService =
        fixture.debugElement.injector.get(PlanService);
      const routerStub: Router = fixture.debugElement.injector.get(Router);
      spyOn(routerStub, 'navigate').and.callThrough();

      const emptyGeoJson: GeoJSON.GeoJSON = {
        type: 'FeatureCollection',
        features: [],
      };
      const createPlanSpy = spyOn<any>(
        component,
        'createPlan'
      ).and.callThrough();

      fixture.componentInstance.openCreatePlanDialog();
      tick();

      expect(createPlanSpy).toHaveBeenCalledWith('test name', emptyGeoJson);
      expect(planServiceStub.createPlan).toHaveBeenCalled();
      expect(routerStub.navigate).toHaveBeenCalledOnceWith(['plan', 'temp']);
    }));
  });

  describe('Map session management', () => {
    it('saves map settings to session on an interval', () => {
      component.ngOnInit();
      const sessionServiceStub: SessionService =
        fixture.debugElement.injector.get(SessionService);

      sessionInterval.next(1);

      expect(sessionServiceStub.setMapConfigs).toHaveBeenCalled();
      expect(sessionServiceStub.setMapViewOptions).toHaveBeenCalled();
    });

    it('restores map configs from session', () => {
      const sessionServiceStub: SessionService =
        fixture.debugElement.injector.get(SessionService);
      const mapConfig = defaultMapConfig();
      mapConfig.boundaryLayerConfig = {
        boundary_name: 'HUC-12',
        vector_name: 'sierra-nevada:vector_huc12',
        shape_name: 'Name',
      };
      const savedMapConfigs: Record<Region, MapConfig[]> =
        defaultMapConfigsDictionary();

      sessionServiceStub.mapConfigs$.next(savedMapConfigs);
      component.ngOnInit();

      expect(component.maps.map((map) => map.config)).toEqual(
        savedMapConfigs['Sierra Nevada']
      );
    });

    it('restores map view options from session', () => {
      const sessionServiceStub: SessionService =
        fixture.debugElement.injector.get(SessionService);
      const mapViewOptions: MapViewOptions = defaultMapViewOptions();
      mapViewOptions.numVisibleMaps = 4;

      sessionServiceStub.mapViewOptions$.next(mapViewOptions);
      component.ngOnInit();

      expect(component.mapViewOptions$.getValue()).toEqual(mapViewOptions);
    });
  });

  describe('Map detail card popups', () => {
    let applicationRef: ApplicationRef;

    beforeEach(() => {
      applicationRef = fixture.componentInstance.applicationRef;
      spyOn(applicationRef, 'attachView').and.callThrough;

      component.ngAfterViewInit();
    });

    describe('popup triggering', () => {
      beforeEach(() => {
        // Add a polygon to map 3
        const fakeGeometry: GeoJSON.Geometry = {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 1],
            ],
          ],
        };
        const feature: GeoJSON.Feature<GeoJSON.Polygon, any> = {
          type: 'Feature',
          geometry: fakeGeometry,
          properties: {
            PROJECT_NAME: 'test_project',
          },
        };
        component.maps[3].existingProjectsLayerRef = L.geoJSON(feature);
        component.maps[3].existingProjectsLayerRef.addTo(
          component.maps[3].instance!
        );
      });

      it('attaches popup when feature polygon is clicked', () => {
        // Click on the polygon
        component.maps[3].instance?.fireEvent('click', {
          latlng: [0, 0],
        });

        expect(applicationRef.attachView).toHaveBeenCalledTimes(1);
      });

      it('does not attach popup when map is clicked outside the polygon', () => {
        // Click outside the polygon
        component.maps[3].instance?.fireEvent('click', {
          latlng: [2, 2],
        });

        expect(applicationRef.attachView).toHaveBeenCalledTimes(0);
      });

      it('does not attach popup if drawing mode is active', () => {
        component.mapManager.isInDrawingMode = true;

        // Click on the polygon
        component.maps[3].instance?.fireEvent('click', {
          latlng: [0, 0],
        });

        expect(applicationRef.attachView).toHaveBeenCalledTimes(0);
      });
    });

    it('popup is removed when existing project layer is removed', () => {
      spyOn(component.maps[3].instance!, 'closePopup');

      component.maps[3].instance?.openPopup('test', [0, 0]);
      component.maps[3].existingProjectsLayerRef?.fire('remove');

      expect(component.maps[3].instance?.closePopup).toHaveBeenCalled();
    });
  });

  describe('data layer opacity functions', () => {
    it('changeOpacity changes opacity on the currently selected data layer', () => {
      spyOn(mapManager, 'changeOpacity').and.returnValue();

      component.changeOpacity(0.5);

      expect(component.maps[0].config.dataLayerConfig.opacity).toEqual(0.5);
    });

    it('getOpacityForSelectedMap gets opacity for selected map', () => {
      component.maps[0].config.dataLayerConfig.opacity = 0.5;

      component.getOpacityForSelectedMap().subscribe((opacity) => {
        expect(opacity).toEqual(0.5);
      });
    });

    it('mapHasDataLayer returns true if map has data layer', () => {
      component.maps[0].config.dataLayerConfig.layer = 'test_metric_1';

      component.mapHasDataLayer().subscribe((result) => {
        expect(result).toBeTrue();
      });
    });

    it('mapHasDataLayer returns false if map does not have data layer', () => {
      component.maps[0].config.dataLayerConfig.layer = '';

      component.mapHasDataLayer().subscribe((result) => {
        expect(result).toBeFalse();
      });
    });
  });
});
