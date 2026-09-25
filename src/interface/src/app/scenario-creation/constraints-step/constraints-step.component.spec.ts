import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MockProvider } from 'ng-mocks';

import { ConstraintsStepComponent } from './constraints-step.component';
import { HttpClientModule } from '@angular/common/http';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { NewScenarioState } from '../new-scenario.state';
import { ModuleService } from '@app/services/module.service';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NgxMaskModule } from 'ngx-mask';
import { FormControl, FormGroup } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ConstraintsStepComponent', () => {
  let component: ConstraintsStepComponent;
  let fixture: ComponentFixture<ConstraintsStepComponent>;
  let dataLayersStateService: DataLayersStateService;
  let moduleService: ModuleService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ConstraintsStepComponent,
        HttpClientModule,
        MatDialogModule,
        MatSnackBarModule,
        NgxMaskModule.forRoot(),
        NoopAnimationsModule,
      ],
      providers: [
        MockProvider(DataLayersStateService, {
          viewedDataLayer$: of(null),
          updateSelectedLayers: jasmine.createSpy('updateSelectedLayers'),
          setMaxSelectedLayers: jasmine.createSpy('setMaxSelectedLayers'),
          clearUnselectableLayers: jasmine.createSpy('clearUnselectableLayers'),
          resetAll: jasmine.createSpy('resetAll'),
        }),
        MockProvider(NewScenarioState, {
          scenarioConfig$: of({}),
        }),
        MockProvider(ModuleService, {
          getModule: jasmine
            .createSpy('getModule')
            .and.returnValue(of({ options: { datalayers: [] } })),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConstraintsStepComponent);
    component = fixture.componentInstance;
    dataLayersStateService = TestBed.inject(DataLayersStateService);
    moduleService = TestBed.inject(ModuleService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getData', () => {
    it('should return nulls and an empty adv_constraints array when the form has no child groups', () => {
      const result = component.getData();

      expect(result).toEqual({
        max_slope: null,
        min_distance_from_road: null,
        adv_constraints: [],
      });
    });

    it('should pull max_slope and min_distance_from_road from standLevelConstraints when present', () => {
      component.form.controls.standLevelConstraints?.patchValue({
        max_slope: 30,
        min_distance_from_road: 50,
      });

      const result = component.getData();

      expect(result.max_slope).toBe(30);
      expect(result.min_distance_from_road).toBe(50);
    });

    it('should default adv_constraints to an empty array when constraints control value is null', () => {
      component.form.addControl(
        'advStandLevelConstraints',
        new FormGroup({
          constraints: new FormControl<any>(null),
        })
      );

      const result = component.getData();

      expect(result.adv_constraints).toEqual([]);
    });
  });

  describe('beforeStepLoad', () => {
    it('should reset selected/unselectable layers and set max selectable layers', () => {
      spyOn(component.advConstraintsComponent, 'mapConfigToUI');

      component.beforeStepLoad();

      expect(dataLayersStateService.updateSelectedLayers).toHaveBeenCalledWith(
        []
      );
      expect(dataLayersStateService.setMaxSelectedLayers).toHaveBeenCalledWith(
        Number.POSITIVE_INFINITY
      );
      expect(dataLayersStateService.clearUnselectableLayers).toHaveBeenCalled();
    });

    it('should trigger the child component to refresh via mapConfigToUI', () => {
      spyOn(component.advConstraintsComponent, 'mapConfigToUI');

      component.beforeStepLoad();

      expect(
        component.advConstraintsComponent.mapConfigToUI
      ).toHaveBeenCalled();
    });
  });

  describe('beforeStepExit', () => {
    it('should reset all data layer state and clear selected layers', () => {
      component.beforeStepExit();

      expect(dataLayersStateService.resetAll).toHaveBeenCalled();
      expect(dataLayersStateService.updateSelectedLayers).toHaveBeenCalledWith(
        []
      );
    });
  });

  describe('constraintLayers$', () => {
    it('should emit the datalayers from the advanced_stand_level_constraint module', (done) => {
      component.constraintLayers$.subscribe((layers) => {
        expect(layers).toEqual([]);
        expect(moduleService.getModule).toHaveBeenCalledWith(
          'advanced_stand_level_constraint'
        );
        done();
      });
    });
  });
});
