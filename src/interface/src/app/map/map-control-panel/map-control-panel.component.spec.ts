import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatRadioGroupHarness } from '@angular/material/radio/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
import {
  BaseLayerType,
  defaultMapConfig,
  defaultMapViewOptions,
} from 'src/app/types';

import { LayerInfoCardComponent } from './../layer-info-card/layer-info-card.component';
import { MapControlPanelComponent } from './map-control-panel.component';

describe('MapControlPanelComponent', () => {
  let component: MapControlPanelComponent;
  let fixture: ComponentFixture<MapControlPanelComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, MaterialModule, NoopAnimationsModule],
      declarations: [LayerInfoCardComponent, MapControlPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapControlPanelComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);

    component.boundaryConfig = [
      {
        boundary_name: 'huc12',
        display_name: 'HUC-12',
      },
    ];
    component.conditionsConfig$ = of({});
    component.maps = [1, 2, 3, 4].map((id) => {
      return {
        id: `map${id}`,
        name: `Map ${id}`,
        config: defaultMapConfig(),
      };
    });
    console.log(component.maps);
    component.mapViewOptions = defaultMapViewOptions();

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Map control panel', () => {
    let buttonHarnesses: MatButtonHarness[];

    beforeEach(async () => {
      spyOn(component.changeMapCount, 'emit');
      const childLoader = await loader.getChildLoader('.map-count-button-row');
      buttonHarnesses = await childLoader.getAllHarnesses(MatButtonHarness);
    });

    it('toggles to show 1 map', async () => {
      await buttonHarnesses[0].click();

      expect(component.changeMapCount.emit).toHaveBeenCalledOnceWith(1);
    });

    it('toggles to show 2 maps', async () => {
      await buttonHarnesses[1].click();

      expect(component.changeMapCount.emit).toHaveBeenCalledOnceWith(2);
    });
  });

  describe('condition tree', () => {
    beforeEach(() => {
      component.conditionDataSource.data = [
        {
          children: [{}, {}, {}],
        },
        {
          children: [],
        },
      ];
    });

    it('styles children of a selected node and unstyles all other nodes', () => {
      const nodeWithChildren = component.conditionDataSource.data[0];
      const nodeWithoutChildren = component.conditionDataSource.data[1];

      component.onSelect(nodeWithChildren);

      nodeWithChildren.children?.forEach((child) => {
        expect(child.styleDisabled).toBeTrue();
      });
      expect(nodeWithChildren.styleDisabled).toBeFalse();
      expect(nodeWithoutChildren.styleDisabled).toBeFalse();

      component.onSelect(nodeWithoutChildren);

      component.conditionDataSource.data.forEach((node) => {
        expect(node.styleDisabled).toBeFalse();
        node.children?.forEach((child) => {
          expect(child.styleDisabled).toBeFalse();
        });
      });
    });
  });

  describe('Layer control panels', () => {
    const testCases = [1, 2, 3, 4];

    testCases.forEach((testCase) => {
      describe(`map-${testCase} should toggle layers`, () => {
        beforeEach(() => {
          component.mapViewOptions!.selectedMapIndex = testCase - 1;
        });

        it(`map-${testCase} should change base layer`, async () => {
          let map = component.maps[testCase - 1];
          spyOn(component.changeBaseLayer, 'emit');
          console.log(await loader.getAllHarnesses(MatRadioGroupHarness));
          const radioButtonGroup = await loader.getHarness(
            MatRadioGroupHarness.with({ name: `${map.id}-base-layer-select` })
          );
          console.log(testCase, map.config.baseLayerType);

          // Act: select the terrain base layer
          await radioButtonGroup.checkRadioButton({ label: 'Terrain' });

          console.log(testCase, map.config.baseLayerType);

          // Assert: expect that the map contains the terrain base layer
          expect(component.changeBaseLayer.emit).toHaveBeenCalledWith(map);
          expect(map.config.baseLayerType).toBe(BaseLayerType.Terrain);

          // Act: select the road base layer
          await radioButtonGroup.checkRadioButton({ label: 'Road' });

          // Assert: expect that the map was updated
          expect(component.changeBaseLayer.emit).toHaveBeenCalledWith(map);
          expect(map.config.baseLayerType).toBe(BaseLayerType.Road);
        });

        it(`map-${testCase} should change boundary layer`, async () => {
          let map = component.maps[testCase - 1];
          spyOn(component.changeBoundaryLayer, 'emit');
          const radioButtonGroup = await loader.getHarness(
            MatRadioGroupHarness.with({ name: `${map.id}-boundaries-select` })
          );

          // Act: select the HUC-12 boundary
          await radioButtonGroup.checkRadioButton({ label: 'HUC-12' });

          // Assert: expect that the map was updated
          expect(component.changeBoundaryLayer.emit).toHaveBeenCalledWith(map);
          expect(map.config.boundaryLayerConfig.boundary_name).toEqual('huc12');
        });

        it(`map-${testCase} should toggle existing projects layer`, async () => {
          let map = component.maps[testCase - 1];
          spyOn(component.toggleExistingProjectsLayer, 'emit');
          const checkbox = await loader.getHarness(
            MatCheckboxHarness.with({
              name: `${map.id}-existing-projects-toggle`,
            })
          );

          // Act: check the existing projects checkbox
          await checkbox.check();

          // Assert: expect that the map was updated
          expect(
            component.toggleExistingProjectsLayer.emit
          ).toHaveBeenCalledWith(map);
          expect(map.config.showExistingProjectsLayer).toBeTrue();

          // Act: uncheck the existing projects checkbox
          await checkbox.uncheck();

          // Assert: expect that the map was updated
          expect(
            component.toggleExistingProjectsLayer.emit
          ).toHaveBeenCalledWith(map);
          expect(map.config.showExistingProjectsLayer).toBeFalse();
        });
      });
    });
  });
});
