import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ApplicationRef, DebugElement, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatRadioModule } from '@angular/material/radio';
import { MatRadioGroupHarness } from '@angular/material/radio/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, of } from 'rxjs';

import { MapService } from '../map.service';
import { PopupService } from '../popup.service';
import { SessionService } from './../session.service';
import { BaseLayerType, Map, Region } from './../types';
import { MapComponent } from './map.component';
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
    const popupServiceStub = () => ({
      makeDetailsPopup: (shape_name: any) => ({}),
    });
    TestBed.configureTestingModule({
      imports: [FormsModule, MatCheckboxModule, MatRadioModule],
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [MapComponent, ProjectCardComponent],
      providers: [
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
          showExistingProjectsLayer: true,
          showHuc12BoundaryLayer: false,
          showHuc10BoundaryLayer: false,
          showCountyBoundaryLayer: false,
          showUsForestBoundaryLayer: false,
          showDataLayer: false,
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
    let matCountRadioButtonGroup: MatRadioGroupHarness;

    beforeEach(async () => {
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
      matCountRadioButtonGroup = await loader.getHarness(
        MatRadioGroupHarness.with({ name: 'map-count-select' })
      );
    });

    it('shows 2 maps by default', () => {
      expect(component.mapCount).toBe(2);
      matCountRadioButtonGroup
        .getCheckedValue()
        .then((value: string | null) => {
          expect(value).toBe('2');
        });

      expect(map1.attributes['hidden']).toBeUndefined();
      expect(map2.attributes['hidden']).toBeUndefined();
      expect(map3.attributes['hidden']).toBeDefined();
      expect(map4.attributes['hidden']).toBeDefined();
    });

    it('toggles to show 1 map', async () => {
      await matCountRadioButtonGroup.checkRadioButton({ label: '1' });

      expect(component.mapCount).toBe(1);
      expect(map1.attributes['hidden']).toBeUndefined();
      expect(map2.attributes['hidden']).toBeDefined();
      expect(map3.attributes['hidden']).toBeDefined();
      expect(map4.attributes['hidden']).toBeDefined();
    });

    it('toggles to show 4 maps', async () => {
      await matCountRadioButtonGroup.checkRadioButton({ label: '4' });

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

        it(`map-${testCase + 1} should toggle data layer`, async () => {
          let map = component.maps[testCase];
          spyOn(component, 'toggleDataLayer').and.callThrough();
          const checkbox = await loader.getHarness(
            MatCheckboxHarness.with({ name: `${map.id}-data-toggle` })
          );

          // Act: check the data checkbox
          await checkbox.check();

          // Assert: expect that the map contains the data layer
          expect(component.toggleDataLayer).toHaveBeenCalled();
          expect(map.instance?.hasLayer(map.dataLayerRef!)).toBeTrue();

          // Act: uncheck the data checkbox
          await checkbox.uncheck();

          // Assert: expect that the map does not contain the data layer
          expect(component.toggleDataLayer).toHaveBeenCalled();
          expect(map.instance?.hasLayer(map.dataLayerRef!)).toBeFalse();
        });
      });
    });
  });
});
