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
import { By } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import * as L from 'leaflet';
import { BehaviorSubject, of } from 'rxjs';

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
} from './../types';
import { MapComponent } from './map.component';
import { PlanCreateDialogComponent } from './plan-create-dialog/plan-create-dialog.component';
import { ProjectCardComponent } from './project-card/project-card.component';

describe('MapComponent', () => {
  let component: MapComponent;
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
      expect(component.mapViewOptions.numVisibleMaps).toBe(2);

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

      expect(component.mapViewOptions.numVisibleMaps).toBe(1);
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

      expect(component.mapViewOptions.numVisibleMaps).toBe(4);
      expect(map1.attributes['hidden']).toBeUndefined();
      expect(map2.attributes['hidden']).toBeUndefined();
      expect(map3.attributes['hidden']).toBeUndefined();
      expect(map4.attributes['hidden']).toBeUndefined();
    });
  });

  describe('Map selection', () => {
    it('first map is selected by default', () => {
      expect(component.mapViewOptions.selectedMapIndex).toBe(0);
    });

    it('can select another map', () => {
      component.ngAfterViewInit();

      // Clicking the initialized map should select it
      component.maps[2].instance?.fireEvent('click');

      expect(component.mapViewOptions.selectedMapIndex).toBe(2);
    });

    it('selected map is always visible', () => {
      [0, 1, 2, 3].forEach((selectedMapIndex: number) => {
        component.mapViewOptions.selectedMapIndex = selectedMapIndex;
        [1, 2, 4].forEach((mapCount: number) => {
          component.mapViewOptions.numVisibleMaps = mapCount;

          expect(
            component.isMapVisible(component.mapViewOptions.selectedMapIndex)
          ).toBeTrue();
        });
      });
    });

    it('all maps are visible in 4-map view', () => {
      component.mapViewOptions.numVisibleMaps = 4;

      [0, 1, 2, 3].forEach((mapIndex: number) => {
        expect(component.isMapVisible(mapIndex)).toBeTrue();
      });
    });

    it('only selected map is visible in 1-map view', () => {
      component.mapViewOptions.numVisibleMaps = 1;

      [0, 1, 2, 3].forEach((selectedMapIndex: number) => {
        component.mapViewOptions.selectedMapIndex = selectedMapIndex;
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
      component.mapViewOptions.numVisibleMaps = 1;

      [0, 1].forEach((selectedMapIndex: number) => {
        component.mapViewOptions.selectedMapIndex = selectedMapIndex;

        expect(component.mapRowHeight(0)).toEqual('100%');
        expect(component.mapRowHeight(1)).toEqual('0%');
      });

      [2, 3].forEach((selectedMapIndex: number) => {
        component.mapViewOptions.selectedMapIndex = selectedMapIndex;

        expect(component.mapRowHeight(0)).toEqual('0%');
        expect(component.mapRowHeight(1)).toEqual('100%');
      });
    });

    it('all row heights are 50% in 4-map view', () => {
      component.mapViewOptions.numVisibleMaps = 4;

      [0, 1].forEach((mapRowIndex: number) => {
        expect(component.mapRowHeight(mapRowIndex)).toEqual('50%');
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
          const showConditionsCheckbox = await loader.getHarness(
            MatCheckboxHarness.with({
              name: `${map.id}-conditions-toggle`,
            })
          );

          // Act: toggle on conditions
          await showConditionsCheckbox.check();

          // Assert: expect that map config is updated but data layer ref is undefined
          expect(component.changeConditionsLayer).toHaveBeenCalled();
          expect(map.config.showDataLayer).toBeTrue();
          expect(map.dataLayerRef).toBeUndefined();

          // Act: select test metric 1
          const radioButtonGroup = await loader.getHarness(
            MatRadioGroupHarness.with({ name: `${map.id}-conditions-select` })
          );
          await radioButtonGroup.checkRadioButton({ label: 'test_metric_1' });

          // Assert: expect that the map contains test metric 1
          expect(component.changeConditionsLayer).toHaveBeenCalled();
          expect(map.config.dataLayerConfig.metric_name).toEqual(
            'test_metric_1'
          );
          expect(map.dataLayerRef).toBeDefined();
          expect(map.instance?.hasLayer(map.dataLayerRef!)).toBeTrue();

          // Act: toggle on normalized data
          const normalizeCheckbox = await loader.getHarness(
            MatCheckboxHarness.with({
              name: `${map.id}-normalized-conditions-toggle`,
            })
          );
          await normalizeCheckbox.check();

          // Assert: expect that the map contains the normalized data layer
          expect(component.changeConditionsLayer).toHaveBeenCalled();
          expect(map.config.normalizeDataLayer).toBeTrue;
          expect(map.dataLayerRef).toBeDefined();
          expect(map.instance?.hasLayer(map.dataLayerRef!)).toBeTrue();
        });
      });
    });
  });
  describe('Plan creation dropdown', () => {
    beforeEach(async () => {
      component.ngAfterViewInit();
    });

    it('enables polygon tool when drawing option is selected', async () => {
      spyOn(component, 'onPlanCreationOptionChange').and.callThrough();
      const polygonSpy = spyOn(L.Draw, 'Polygon').and.callThrough();
      const select = await loader.getHarness(MatSelectHarness);
      await select.open();
      const option = await select.getOptions();

      await option[0].click(); // 'draw-area' option

      expect(component.onPlanCreationOptionChange).toHaveBeenCalled();
      expect(polygonSpy).toHaveBeenCalled();
    });
  });

  describe('Create plan', () => {
    it('opens create plan dialog', async () => {
      const fakeMatDialog: MatDialog =
        fixture.debugElement.injector.get(MatDialog);
      fixture.componentInstance.showCreatePlanButton = true;
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
      mapConfig.boundaryLayerName = 'huc-12';
      const savedMapConfigs: MapConfig[] = Array(4).fill(mapConfig);

      sessionServiceStub.mapConfigs$.next(savedMapConfigs);
      component.ngOnInit();

      expect(component.maps.map((map) => map.config)).toEqual(savedMapConfigs);
    });

    it('restores map view options from session', () => {
      const sessionServiceStub: SessionService =
        fixture.debugElement.injector.get(SessionService);
      const mapViewOptions: MapViewOptions = {
        numVisibleMaps: 4,
        selectedMapIndex: 1,
      };

      sessionServiceStub.mapViewOptions$.next(mapViewOptions);
      component.ngOnInit();

      expect(component.mapViewOptions).toEqual(mapViewOptions);
    });
  });
});
