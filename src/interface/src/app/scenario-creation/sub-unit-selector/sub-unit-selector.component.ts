import { Component } from '@angular/core';
import { SectionComponent } from '@styleguide';
import { CommonModule } from '@angular/common';
import {
  FormGroup,
  ReactiveFormsModule,
  FormControl,
  Validators,
} from '@angular/forms';
import { StepDirective } from '@styleguide';
import { map, Observable, take } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import {
  ApiModule,
  BaseLayer,
  ScenarioDraftConfiguration,
  SubUnits,
} from '@app/types';
import { NewScenarioState } from '../new-scenario.state';
import { BaseLayersStateService } from '@app/base-layers/base-layers.state.service';
import { ModuleService } from '@app/services/module.service';

@Component({
  selector: 'app-sub-unit-selector',
  templateUrl: './sub-unit-selector.component.html',
  styleUrl: './sub-unit-selector.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    ReactiveFormsModule,
    SectionComponent,
  ],
  providers: [
    { provide: StepDirective, useExisting: SubUnitSelectorComponent },
  ],
})
export class SubUnitSelectorComponent extends StepDirective<ScenarioDraftConfiguration> {
  constructor(
    private newScenarioState: NewScenarioState,
    private baseLayersStateService: BaseLayersStateService,
    private moduleService: ModuleService
  ) {
    super();
  }

  form = new FormGroup({
    sub_units_layer: new FormControl<number | undefined>(undefined, [
      Validators.required,
    ]),
  });

  subUnitLayerOptions$: Observable<BaseLayer[]> = this.moduleService
    .getModule<ApiModule<SubUnits>>('prioritize_sub_units')
    .pipe(
      map((results) => {
        return results.options.sub_units;
      })
    );

  loadingLayers$ = this.baseLayersStateService.loadingLayers$;

  selectedSubUnit: number | null = null;

  getData() {
    return this.form.value;
  }

  onSubunitSelect(selectedLayer: BaseLayer) {
    this.baseLayersStateService.updateBaseLayers(selectedLayer, false);
  }

  override beforeStepLoad(): void {
    // set the form selection to whatever is in the saved config
    this.newScenarioState.scenarioConfig$.pipe(take(1)).subscribe((config) => {
      if (config.sub_units_layer) {
        this.selectedSubUnit = config.sub_units_layer;
      }
    });
    this.form.controls['sub_units_layer'].setValue(this.selectedSubUnit);
  }

  override beforeStepExit(): void {
    this.baseLayersStateService.clearBaseLayer();
  }
}
