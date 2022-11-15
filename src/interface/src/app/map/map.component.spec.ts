import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentRef, NO_ERRORS_SCHEMA, ViewContainerRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatRadioModule } from '@angular/material/radio';
import { MatRadioGroupHarness } from '@angular/material/radio/testing';
import { BehaviorSubject, of } from 'rxjs';

import { MapService } from '../map.service';
import { PopupService } from '../popup.service';
import { SessionService } from './../session.service';
import { BaseLayerType, Region } from './../types';
import { MapComponent } from './map.component';
import { ProjectCardComponent } from './project-card/project-card.component';

describe('MapComponent', () => {
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;
  let loader: HarnessLoader;
  let mockSessionService: Partial<SessionService>
  let fakeGeoJSON: GeoJSON.GeoJSON | any;

  beforeEach(() => {
    fakeGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: "Feature",
          geometry: {
            type: "MultiPolygon",
            coordinates: [[[[10, 20], [10, 30], [15, 15]]]],
          },
          properties: {
            shape_name: "Test"
          }
        }
      ],
    };
    const fakeMapService = jasmine.createSpyObj<MapService>(
      'MapService',
      {
        getBoundaryShapes: of(fakeGeoJSON),
        getExistingProjects: of(fakeGeoJSON),
        getRegionBoundary: of(fakeGeoJSON),
      },
      {},
    );
    mockSessionService = {
      region$: new BehaviorSubject<Region|null>(Region.SIERRA_NEVADA),
    };
    const popupServiceStub = () => ({ makeDetailsPopup: (shape_name: any) => ({}) });
    TestBed.configureTestingModule({
      imports: [FormsModule, MatCheckboxModule, MatRadioModule],
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [MapComponent, ProjectCardComponent],
      providers: [
        { provide: MapService, useValue: fakeMapService },
        { provide: PopupService, useFactory: popupServiceStub },
        { provide: SessionService, useValue: mockSessionService },
      ]
    });
    fixture = TestBed.createComponent(MapComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('can load instance', () => {
    expect(component).toBeTruthy();
  });

  it(`baseLayerType has default value`, () => {
    expect(component.baseLayerType).toEqual(BaseLayerType.Road);
  });

  it(`baseLayerTypes has default value`, () => {
    expect(component.baseLayerTypes).toEqual([BaseLayerType.Road,BaseLayerType.Terrain]);
  });

  it(`BaseLayerType has default value`, () => {
    expect(component.BaseLayerType).toEqual(BaseLayerType);
  });

  it(`showExistingProjectsLayer has default value`, () => {
    expect(component.showExistingProjectsLayer).toEqual(true);
  });

  it(`showHUC12BoundariesLayer has default value`, () => {
    expect(component.showHUC12BoundariesLayer).toEqual(true);
  });

  describe('ngAfterViewInit', () => {
    it('initializes the map', () => {
      const mapServiceStub: MapService = fixture.debugElement.injector.get(
        MapService
      );

      component.ngAfterViewInit();

      expect(mapServiceStub.getRegionBoundary).toHaveBeenCalledWith(Region.SIERRA_NEVADA);
      expect(mapServiceStub.getBoundaryShapes).toHaveBeenCalled();
      expect(mapServiceStub.getExistingProjects).toHaveBeenCalled();
    });

    it('creates project detail card with geojson feature', () => {
      const viewContainerRef: ViewContainerRef = fixture.componentInstance.viewContainerRef;
      const projectCardComponent: ComponentRef<ProjectCardComponent> = viewContainerRef.createComponent(ProjectCardComponent);
      spyOn(viewContainerRef, 'createComponent').and.returnValue(projectCardComponent);

      component.ngAfterViewInit();

      expect(viewContainerRef.createComponent).toHaveBeenCalled();
      expect(projectCardComponent.instance.feature).toBe(fakeGeoJSON.features[0]);
    });
  });

  it('should change base layer', async () => {
    component.ngAfterViewInit();
    spyOn(component, 'changeBaseLayer').and.callThrough();
    const radioButtonGroup = await loader.getHarness(MatRadioGroupHarness.with({ name: 'base-layer-select' }));

    // Act: select the terrain base layer
    await radioButtonGroup.checkRadioButton({ label: 'Terrain' });

    // Assert: expect that the map contains the terrain base layer
    expect(component.changeBaseLayer).toHaveBeenCalled();
    expect(component.map.hasLayer(MapComponent.hillshade_tiles));

    // Act: select the road base layer
    await radioButtonGroup.checkRadioButton({ label: 'Road' });

    // Assert: expect that the map contains the road base layer
    expect(component.changeBaseLayer).toHaveBeenCalled();
    expect(component.map.hasLayer(MapComponent.open_street_maps_tiles));
  });

  it('should toggle HUC-12 boundaries', async () => {
    component.ngAfterViewInit();
    spyOn(component, 'toggleHUC12BoundariesLayer').and.callThrough();
    const checkbox = await loader.getHarness(MatCheckboxHarness.with({ name: 'huc12-toggle' }));

    // Act: uncheck the HUC-12 checkbox
    await checkbox.uncheck();

    // Assert: expect that the map does not contain the HUC-12 layer
    expect(component.toggleHUC12BoundariesLayer).toHaveBeenCalled();
    expect(component.map.hasLayer(component.HUC12BoundariesLayer)).toBeFalse();

    // Act: check the HUC-12 checkbox
    await checkbox.check();

    // Assert: expect that the map contains the HUC-12 layer
    expect(component.toggleHUC12BoundariesLayer).toHaveBeenCalled();
    expect(component.map.hasLayer(component.HUC12BoundariesLayer)).toBeTrue();
  });

  it('should toggle existing projects layer', async () => {
    component.ngAfterViewInit();
    spyOn(component, 'toggleExistingProjectsLayer').and.callThrough();

    // Act: uncheck the existing projects checkbox
    const checkbox = await loader.getHarness(MatCheckboxHarness.with({ name: 'existing-projects-toggle' }));
    await checkbox.uncheck();

    // Assert: expect that the map removes the existing projects layer
    expect(component.toggleExistingProjectsLayer).toHaveBeenCalled();
    expect(component.map.hasLayer(component.existingProjectsLayer)).toBeFalse();

    // Act: check the existing projects checkbox
    await checkbox.check();

    // Assert: expect that the map adds the existing projects layer
    expect(component.toggleExistingProjectsLayer).toHaveBeenCalled();
    expect(component.map.hasLayer(component.existingProjectsLayer)).toBeTrue();
  });
});
