import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ApplicationRef, DebugElement, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { MatRadioGroupHarness } from '@angular/material/radio/testing';
import { MatSelectModule } from '@angular/material/select';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { featureCollection, point } from '@turf/helpers';
import * as L from 'leaflet';
import * as shp from 'shpjs';

import { MapService, PopupService, SessionService } from '../services';
import {
  BaseLayerType,
  Map,
  MapConfig,
  MapViewOptions,
  Region,
  defaultMapConfig,
  ConditionsConfig,
  BoundaryConfig,
  defaultMapViewOptions,
} from './../types';
import { MapManager } from './map-manager';
import { MapComponent } from './map.component';
import { PlanCreateDialogComponent } from './plan-create-dialog/plan-create-dialog.component';
import { ProjectCardComponent } from './project-card/project-card.component';

interface ExtendedWindow extends Window {
  FileReader: FileReader;
}

describe('MapComponent', () => {
  let component: MapComponent;
  let mapManager: MapManager;
  let fixture: ComponentFixture<MapComponent>;
  let loader: HarnessLoader;
  let sessionInterval = new BehaviorSubject<number>(0);

  beforeEach(() => {
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

    const fakeMapService = jasmine.createSpyObj<MapService>(
      'MapService',
      {
        getExistingProjects: of(fakeGeoJson),
        getRegionBoundary: of(fakeGeoJson),
        getBoundaryShapes: of(fakeGeoJson),
      },
      {
        boundaryConfig$: new BehaviorSubject<BoundaryConfig[] | null>([
          {
            boundary_name: 'HUC-12',
          },
        ]),
        conditionsConfig$: new BehaviorSubject<ConditionsConfig | null>({
          pillars: [
            {
              display: true,
              elements: [
                {
                  metrics: [
                    {
                      metric_name: 'test_metric_1',
                      filepath: 'test_metric_1',
                    },
                  ],
                },
              ],
            },
          ],
        }),
      }
    );
    const fakeSessionService = jasmine.createSpyObj<SessionService>(
      'SessionService',
      ['setMapConfigs', 'setMapViewOptions'],
      {
        mapViewOptions$: new BehaviorSubject<MapViewOptions | null>(null),
        mapConfigs$: new BehaviorSubject<MapConfig[] | null>(null),
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
    const popupServiceStub = () => ({
      makeDetailsPopup: (shape_name: any) => ({}),
    });
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MatCheckboxModule,
        MatRadioModule,
        MatSelectModule,
        MatSnackBarModule,
        BrowserAnimationsModule,
      ],
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [
        MapComponent,
        ProjectCardComponent,
        PlanCreateDialogComponent,
      ],
      providers: [
        { provide: MatDialog, useValue: fakeMatDialog },
        { provide: MapService, useValue: fakeMapService },
        { provide: PopupService, useFactory: popupServiceStub },
        { provide: SessionService, useValue: fakeSessionService },
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

      expect(mapServiceStub.getRegionBoundary).toHaveBeenCalledWith(
        Region.SIERRA_NEVADA
      );
      expect(mapServiceStub.getExistingProjects).toHaveBeenCalled();
    });

    it('sets up drawing', () => {
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

    it('creates project detail card', () => {
      const applicationRef: ApplicationRef =
        fixture.componentInstance.applicationRef;
      spyOn(applicationRef, 'attachView').and.callThrough;

      component.ngAfterViewInit();

      // We expect a project detail card to be attached 4 times, 1x for each map
      expect(applicationRef.attachView).toHaveBeenCalledTimes(4);
    });
  });

  describe('Map control panel', () => {
    let map1: DebugElement;
    let map2: DebugElement;
    let map3: DebugElement;
    let map4: DebugElement;

    beforeEach(() => {
      map1 = fixture.debugElement.query(
        By.css('[data-testid="map1"]')
      ).nativeElement;
      map2 = fixture.debugElement.query(
        By.css('[data-testid="map2"]')
      ).nativeElement;
      map3 = fixture.debugElement.query(
        By.css('[data-testid="map3"]')
      ).nativeElement;
      map4 = fixture.debugElement.query(
        By.css('[data-testid="map4"]')
      ).nativeElement;
    });

    it('shows 2 maps by default', async () => {
      expect(component.mapViewOptions$.getValue().numVisibleMaps).toBe(2);

      expect(map1.attributes['hidden']).toBeUndefined();
      expect(map2.attributes['hidden']).toBeUndefined();
      expect(map3.attributes['hidden']).toBeDefined();
      expect(map4.attributes['hidden']).toBeDefined();
    });

    it('toggles to show 1 map', async () => {
      const childLoader = await loader.getChildLoader('.map-count-button-row');
      const buttonHarnesses = await childLoader.getAllHarnesses(
        MatButtonHarness
      );
      await buttonHarnesses[0].click();

      expect(component.mapViewOptions$.getValue().numVisibleMaps).toBe(1);
      expect(map1.attributes['hidden']).toBeUndefined();
      expect(map2.attributes['hidden']).toBeDefined();
      expect(map3.attributes['hidden']).toBeDefined();
      expect(map4.attributes['hidden']).toBeDefined();
    });

    it('toggles to show 4 maps', async () => {
      const childLoader = await loader.getChildLoader('.map-count-button-row');
      const buttonHarnesses = await childLoader.getAllHarnesses(
        MatButtonHarness
      );
      await buttonHarnesses[2].click();

      expect(component.mapViewOptions$.getValue().numVisibleMaps).toBe(4);
      expect(map1.attributes['hidden']).toBeUndefined();
      expect(map2.attributes['hidden']).toBeUndefined();
      expect(map3.attributes['hidden']).toBeUndefined();
      expect(map4.attributes['hidden']).toBeUndefined();
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

    it('all row heights are 50% in 4-map view', () => {
      component.mapViewOptions$.getValue().numVisibleMaps = 4;

      [0, 1].forEach((mapRowIndex: number) => {
        expect(component.mapRowHeight(mapRowIndex)).toEqual('50%');
      });
    });

    it('enables drawing on selected map and shows cloned layer on other maps', () => {
      component.ngAfterViewInit();

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
    });
  });

  describe('Layer control panels', () => {
    const testCases = [0, 1, 2, 3];

    beforeEach(() => {
      component.ngAfterViewInit();
    });

    testCases.forEach((testCase) => {
      describe(`map-${testCase + 1} should toggle layers`, () => {
        it(`map-${testCase + 1} should change base layer`, async () => {
          let map = component.maps[testCase];
          spyOn(component, 'changeBaseLayer').and.callThrough();
          const radioButtonGroup = await loader.getHarness(
            MatRadioGroupHarness.with({ name: `${map.id}-base-layer-select` })
          );

          // Act: select the terrain base layer
          await radioButtonGroup.checkRadioButton({ label: 'Terrain' });

          // Assert: expect that the map contains the terrain base layer
          expect(component.changeBaseLayer).toHaveBeenCalled();
          expect(map.config.baseLayerType).toBe(BaseLayerType.Terrain);
          expect(map.instance?.hasLayer(map.baseLayerRef!));

          // Act: select the road base layer
          await radioButtonGroup.checkRadioButton({ label: 'Road' });

          // Assert: expect that the map contains the road base layer
          expect(component.changeBaseLayer).toHaveBeenCalled();
          expect(map.config.baseLayerType).toBe(BaseLayerType.Road);
          expect(map.instance?.hasLayer(map.baseLayerRef!));
        });

        it(`map-${testCase + 1} should toggle boundary layer`, async () => {
          let map = component.maps[testCase];
          spyOn(component, 'toggleBoundaryLayer').and.callThrough();
          const radioButtonGroup = await loader.getHarness(
            MatRadioGroupHarness.with({ name: `${map.id}-boundaries-select` })
          );
          expect(map.boundaryLayerRef).toBeUndefined();

          // Act: select the HUC-12 boundary
          await radioButtonGroup.checkRadioButton({ label: 'HUC-12' });

          // Assert: expect that the map contains the HUC-12 layer
          expect(component.toggleBoundaryLayer).toHaveBeenCalled();
          expect(map.boundaryLayerRef).toBeDefined();
          expect(map.instance?.hasLayer(map.boundaryLayerRef!)).toBeTrue();
        });

        it(`map-${
          testCase + 1
        } should toggle existing projects layer`, async () => {
          let map = component.maps[testCase];
          spyOn(component, 'toggleExistingProjectsLayer').and.callThrough();
          const checkbox = await loader.getHarness(
            MatCheckboxHarness.with({
              name: `${map.id}-existing-projects-toggle`,
            })
          );

          // Act: check the existing projects checkbox
          await checkbox.check();

          // Assert: expect that the map adds the existing projects layer
          expect(component.toggleExistingProjectsLayer).toHaveBeenCalled();
          expect(
            map.instance?.hasLayer(map.existingProjectsLayerRef!)
          ).toBeTrue();

          // Act: uncheck the existing projects checkbox
          await checkbox.uncheck();

          // Assert: expect that the map removes the existing projects layer
          expect(component.toggleExistingProjectsLayer).toHaveBeenCalled();
          expect(
            map.instance?.hasLayer(map.existingProjectsLayerRef!)
          ).toBeFalse();
        });

        it(`map-${testCase + 1} should change conditions layer`, async () => {
          let map = component.maps[testCase];
          spyOn(component, 'changeConditionsLayer').and.callThrough();

          // Act: select test metric 1
          // Radio button harnesses inside trees are buggy, so we manually
          // change the value instead.
          map.config.dataLayerConfig.filepath = 'test_metric_1';
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

    it('enables polygon tool when drawing option is selected', async () => {
      spyOn(component, 'onAreaCreationOptionChange').and.callThrough();
      const button = await loader.getHarness(
        MatButtonHarness.with({
          selector: '.draw-area-button',
        })
      );

      await button.click();

      expect(component.onAreaCreationOptionChange).toHaveBeenCalled();
      expect(
        component.maps[
          component.mapViewOptions$.getValue().selectedMapIndex
        ].instance?.hasLayer(mapManager.drawingLayer)
      ).toBeTrue();
    });

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
    it('opens create plan dialog', async () => {
      const fakeMatDialog: MatDialog =
        fixture.debugElement.injector.get(MatDialog);
      fixture.componentInstance.showCreatePlanButton$ =
        new BehaviorSubject<boolean>(true);
      const button = await loader.getHarness(
        MatButtonHarness.with({
          selector: '.create-plan-button',
        })
      );

      await button.click();

      expect(fakeMatDialog.open).toHaveBeenCalled();
    });

    it('dialog calls create plan with name and planning area ', async () => {
      const emptyGeoJson: GeoJSON.GeoJSON = {
        type: 'FeatureCollection',
        features: [],
      };
      const createPlanSpy = spyOn<any>(
        component,
        'createPlan'
      ).and.callThrough();

      fixture.componentInstance.openCreatePlanDialog();

      expect(createPlanSpy).toHaveBeenCalledWith('test name', emptyGeoJson);
    });
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
        boundary_name: 'huc-12',
      };
      const savedMapConfigs: MapConfig[] = Array(4).fill(mapConfig);

      sessionServiceStub.mapConfigs$.next(savedMapConfigs);
      component.ngOnInit();

      expect(component.maps.map((map) => map.config)).toEqual(savedMapConfigs);
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
});
