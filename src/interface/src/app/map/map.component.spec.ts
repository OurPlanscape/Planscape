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

import { MapService } from '../map.service';
import { PopupService } from '../popup.service';
import { SessionService } from './../session.service';
import { BaseLayerType, DataLayerType, Map, Region } from './../types';
import { MapComponent } from './map.component';
import { PlanCreateDialogComponent } from './plan-create-dialog/plan-create-dialog.component';
import { ProjectCardComponent } from './project-card/project-card.component';

describe('MapComponent', () => {
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;
  let loader: HarnessLoader;
  let mockSessionService: Partial<SessionService>;

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
        getHuc12BoundaryShapes: of(fakeGeoJson),
        getHuc10BoundaryShapes: of(fakeGeoJson),
        getCountyBoundaryShapes: of(fakeGeoJson),
        getUsForestBoundaryShapes: of(fakeGeoJson),
        getExistingProjects: of(fakeGeoJson),
        getRegionBoundary: of(fakeGeoJson),
      },
      {}
    );
    mockSessionService = {
      region$: new BehaviorSubject<Region | null>(Region.SIERRA_NEVADA),
    };
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
        { provide: SessionService, useValue: mockSessionService },
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
        expect(map.config).toEqual({
          baseLayerType: BaseLayerType.Road,
          dataLayerType: DataLayerType.None,
          showExistingProjectsLayer: true,
          showHuc12BoundaryLayer: false,
          showHuc10BoundaryLayer: false,
          showCountyBoundaryLayer: false,
          showUsForestBoundaryLayer: false,
        });
      });
    });

    it('calls the MapService for geojson', () => {
      const mapServiceStub: MapService =
        fixture.debugElement.injector.get(MapService);

      expect(mapServiceStub.getRegionBoundary).toHaveBeenCalledWith(
        Region.SIERRA_NEVADA
      );
      expect(mapServiceStub.getHuc12BoundaryShapes).toHaveBeenCalledWith(
        Region.SIERRA_NEVADA
      );
      expect(mapServiceStub.getCountyBoundaryShapes).toHaveBeenCalledWith(
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
        expect(map.huc12BoundaryLayerRef).toBeDefined();
        expect(map.countyBoundaryLayerRef).toBeDefined();
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
      expect(component.mapCount).toBe(2);

      const radioButtonGroup = await loader.getHarness(
        MatRadioGroupHarness.with({ name: 'map-count-select' })
      );
      radioButtonGroup.getCheckedValue().then((value: string | null) => {
        expect(value).toBe('2');
      });

      expect(map1.attributes['hidden']).toBeUndefined();
      expect(map2.attributes['hidden']).toBeUndefined();
      expect(map3.attributes['hidden']).toBeDefined();
      expect(map4.attributes['hidden']).toBeDefined();
    });

    it('toggles to show 1 map', async () => {
      const radioButtonGroup = await loader.getHarness(
        MatRadioGroupHarness.with({ name: 'map-count-select' })
      );
      await radioButtonGroup.checkRadioButton({ label: '1' });

      expect(component.mapCount).toBe(1);
      expect(map1.attributes['hidden']).toBeUndefined();
      expect(map2.attributes['hidden']).toBeDefined();
      expect(map3.attributes['hidden']).toBeDefined();
      expect(map4.attributes['hidden']).toBeDefined();
    });

    it('toggles to show 4 maps', async () => {
      const radioButtonGroup = await loader.getHarness(
        MatRadioGroupHarness.with({ name: 'map-count-select' })
      );
      await radioButtonGroup.checkRadioButton({ label: '4' });

      expect(component.mapCount).toBe(4);
      expect(map1.attributes['hidden']).toBeUndefined();
      expect(map2.attributes['hidden']).toBeUndefined();
      expect(map3.attributes['hidden']).toBeUndefined();
      expect(map4.attributes['hidden']).toBeUndefined();
    });
  });

  describe('Map selection', () => {
    it('first map is selected by default', () => {
      expect(component.selectedMapIndex).toBe(0);
    });

    it('can select another map', () => {
      component.ngAfterViewInit();

      // Clicking the initialized map should select it
      component.maps[2].instance?.fireEvent('click');

      expect(component.selectedMapIndex).toBe(2);
    });

    it('selected map is always visible', () => {
      [0, 1, 2, 3].forEach((selectedMapIndex: number) => {
        component.selectedMapIndex = selectedMapIndex;
        [1, 2, 4].forEach((mapCount: number) => {
          component.mapCount = mapCount;

          expect(component.isMapVisible(component.selectedMapIndex)).toBeTrue();
        });
      });
    });

    it('all maps are visible in 4-map view', () => {
      component.mapCount = 4;

      [0, 1, 2, 3].forEach((mapIndex: number) => {
        expect(component.isMapVisible(mapIndex)).toBeTrue();
      });
    });

    it('only selected map is visible in 1-map view', () => {
      component.mapCount = 1;

      [0, 1, 2, 3].forEach((selectedMapIndex: number) => {
        component.selectedMapIndex = selectedMapIndex;
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
      component.mapCount = 1;

      [0, 1].forEach((selectedMapIndex: number) => {
        component.selectedMapIndex = selectedMapIndex;

        expect(component.mapRowHeight(0)).toEqual('100%');
        expect(component.mapRowHeight(1)).toEqual('0%');
      });

      [2, 3].forEach((selectedMapIndex: number) => {
        component.selectedMapIndex = selectedMapIndex;

        expect(component.mapRowHeight(0)).toEqual('0%');
        expect(component.mapRowHeight(1)).toEqual('100%');
      });
    });

    it('all row heights are 50% in 4-map view', () => {
      component.mapCount = 4;

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

        it(`map-${testCase + 1} should toggle HUC-12 boundaries`, async () => {
          let map = component.maps[testCase];
          spyOn(component, 'toggleHuc12BoundariesLayer').and.callThrough();
          const checkbox = await loader.getHarness(
            MatCheckboxHarness.with({ name: `${map.id}-huc12-toggle` })
          );
          expect(
            map.instance?.hasLayer(map.huc12BoundaryLayerRef!)
          ).toBeFalse();

          // Act: check the HUC-12 checkbox
          await checkbox.check();

          // Assert: expect that the map does not contain the HUC-12 layer
          expect(component.toggleHuc12BoundariesLayer).toHaveBeenCalled();
          expect(map.instance?.hasLayer(map.huc12BoundaryLayerRef!)).toBeTrue();

          // Act: uncheck the HUC-12 checkbox
          await checkbox.uncheck();

          // Assert: expect that the map contains the HUC-12 layer
          expect(component.toggleHuc12BoundariesLayer).toHaveBeenCalled();
          expect(
            map.instance?.hasLayer(map.huc12BoundaryLayerRef!)
          ).toBeFalse();
        });

        it(`map-${testCase + 1} should toggle county boundaries`, async () => {
          let map = component.maps[testCase];
          spyOn(component, 'toggleCountyBoundariesLayer').and.callThrough();
          const checkbox = await loader.getHarness(
            MatCheckboxHarness.with({ name: `${map.id}-county-toggle` })
          );
          expect(
            map.instance?.hasLayer(map.countyBoundaryLayerRef!)
          ).toBeFalse();

          // Act: check the county checkbox
          await checkbox.check();

          // Assert: expect that the map does not contain the county layer
          expect(component.toggleCountyBoundariesLayer).toHaveBeenCalled();
          expect(
            map.instance?.hasLayer(map.countyBoundaryLayerRef!)
          ).toBeTrue();

          // Act: check the county checkbox
          await checkbox.uncheck();

          // Assert: expect that the map contains the county layer
          expect(component.toggleCountyBoundariesLayer).toHaveBeenCalled();
          expect(
            map.instance?.hasLayer(map.countyBoundaryLayerRef!)
          ).toBeFalse();
        });

        it(`map-${
          testCase + 1
        } should toggle existing projects layer`, async () => {
          let map = component.maps[testCase];
          spyOn(component, 'toggleExistingProjectsLayer').and.callThrough();

          // Act: uncheck the existing projects checkbox
          const checkbox = await loader.getHarness(
            MatCheckboxHarness.with({
              name: `${map.id}-existing-projects-toggle`,
            })
          );
          await checkbox.uncheck();

          // Assert: expect that the map removes the existing projects layer
          expect(component.toggleExistingProjectsLayer).toHaveBeenCalled();
          expect(
            map.instance?.hasLayer(map.existingProjectsLayerRef!)
          ).toBeFalse();

          // Act: check the existing projects checkbox
          await checkbox.check();

          // Assert: expect that the map adds the existing projects layer
          expect(component.toggleExistingProjectsLayer).toHaveBeenCalled();
          expect(
            map.instance?.hasLayer(map.existingProjectsLayerRef!)
          ).toBeTrue();
        });

        it(`map-${testCase + 1} should change data layer`, async () => {
          let map = component.maps[testCase];
          spyOn(component, 'changeDataLayer').and.callThrough();
          const radioButtonGroup = await loader.getHarness(
            MatRadioGroupHarness.with({ name: `${map.id}-data-layer-select` })
          );

          // Act: select raw data
          await radioButtonGroup.checkRadioButton({ label: 'Raw' });

          // Assert: expect that the map contains the raw data layer
          expect(component.changeDataLayer).toHaveBeenCalled();
          expect(map.config.dataLayerType).toEqual(DataLayerType.Raw);
          expect(map.instance?.hasLayer(map.dataLayerRef!)).toBeTrue();

          // Act: select normalized data
          await radioButtonGroup.checkRadioButton({ label: 'Normalized' });

          // Assert: expect that the map contains the normalized data layer
          expect(component.changeDataLayer).toHaveBeenCalled();
          expect(map.config.dataLayerType).toEqual(DataLayerType.Normalized);
          expect(map.instance?.hasLayer(map.dataLayerRef!)).toBeTrue();

          // Act: select no data
          await radioButtonGroup.checkRadioButton({ label: 'None' });

          // Assert: expect that the map contains no data layer
          expect(component.changeDataLayer).toHaveBeenCalled();
          expect(map.config.dataLayerType).toEqual(DataLayerType.None);
          expect(map.dataLayerRef).toBeUndefined();
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
});
