import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatLegacyButtonHarness as MatButtonHarness } from '@angular/material/legacy-button/testing';
import { MatLegacyCheckboxHarness as MatCheckboxHarness } from '@angular/material/legacy-checkbox/testing';
import { MatLegacyRadioGroupHarness as MatRadioGroupHarness } from '@angular/material/legacy-radio/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
import { BaseLayerType, NONE_BOUNDARY_CONFIG } from '@types';
import { LayerInfoCardComponent } from '../layer-info-card/layer-info-card.component';
import { ConditionTreeComponent } from './condition-tree/condition-tree.component';
import { MapControlPanelComponent } from './map-control-panel.component';
import { FeaturesModule } from '../../features/features.module';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { defaultMapConfig, defaultMapViewOptions } from '../map.helper';

describe('MapControlPanelComponent', () => {
  let component: MapControlPanelComponent;
  let fixture: ComponentFixture<MapControlPanelComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MaterialModule,
        NoopAnimationsModule,
        FeaturesModule,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      declarations: [
        ConditionTreeComponent,
        LayerInfoCardComponent,
        MapControlPanelComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MapControlPanelComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);

    component.boundaryConfig = [
      {
        boundary_name: 'huc12',
        display_name: 'HUC-12',
        vector_name: 'sierra-nevada:vector_huc12',
        shape_name: 'Name",',
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
          const radioButtonGroup = await loader.getHarness(
            MatRadioGroupHarness.with({ name: `${map.id}-base-layer-select` })
          );

          // Act: select the terrain base layer
          await radioButtonGroup.checkRadioButton({ label: 'Terrain' });

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

  describe('clear all button', () => {
    it('button should be disabled if map has no layers turned on', async () => {
      const button = await loader.getHarness(
        MatButtonHarness.with({ text: /CLEAR ALL/ })
      );

      expect(await button.isDisabled()).toBeTrue();
    });

    it('button should be enabled if map has layers turned on', async () => {
      component.maps[0].config.showExistingProjectsLayer = true;
      const button = await loader.getHarness(
        MatButtonHarness.with({ text: /CLEAR ALL/ })
      );

      expect(await button.isDisabled()).toBeFalse();
    });

    it('all map layers should be cleared when button is pressed', async () => {
      component.maps[0].config.showExistingProjectsLayer = true;
      component.maps[0].config.boundaryLayerConfig = {
        boundary_name: 'huc12',
        display_name: 'HUC-12',
        vector_name: 'sierra-nevada:vector_huc12',
        shape_name: 'Name",',
      };
      spyOn(component.changeBoundaryLayer, 'emit');
      spyOn(component.toggleExistingProjectsLayer, 'emit');
      const button = await loader.getHarness(
        MatButtonHarness.with({ text: /CLEAR ALL/ })
      );

      await button.click();

      expect(component.changeBoundaryLayer.emit).toHaveBeenCalledOnceWith(
        component.maps[0]
      );
      expect(
        component.toggleExistingProjectsLayer.emit
      ).toHaveBeenCalledOnceWith(component.maps[0]);
      expect(component.maps[0].config.showExistingProjectsLayer).toBeFalse();
      expect(component.maps[0].config.boundaryLayerConfig).toEqual(
        NONE_BOUNDARY_CONFIG
      );
    });
  });
});
