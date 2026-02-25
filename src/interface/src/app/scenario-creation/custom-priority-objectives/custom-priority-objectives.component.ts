import { Component } from '@angular/core';
import { SectionComponent, StepDirective } from '@styleguide';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import { ChipSelectorComponent } from '@styleguide/chip-selector/chip-selector.component';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { DataLayer, ScenarioDraftConfiguration } from '@types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NewScenarioState } from '../new-scenario.state';
import { finalize, take } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

const MAX_SELECTABLE_LAYERS = 2;

@UntilDestroy()
@Component({
  selector: 'app-custom-priority-objectives',
  standalone: true,
  imports: [
    ChipSelectorComponent,
    CommonModule,
    DataLayersComponent,
    MatProgressSpinnerModule,
    SectionComponent,
    ReactiveFormsModule,
  ],
  providers: [
    { provide: StepDirective, useExisting: CustomPriorityObjectivesComponent },
  ],
  templateUrl: './custom-priority-objectives.component.html',
  styleUrl: './custom-priority-objectives.component.scss',
})
export class CustomPriorityObjectivesComponent extends StepDirective<ScenarioDraftConfiguration> {
  form = new FormGroup({
    dataLayers: new FormControl<DataLayer[]>(
      [],
      [Validators.required, Validators.minLength(1)]
    ),
  });

  uiLoading = false;

  selectionCount$ = this.dataLayersStateService.selectedLayersCount$;

  selectedItems$ = this.dataLayersStateService.selectedDataLayers$;

  maxLayers = MAX_SELECTABLE_LAYERS;

  constructor(
    private dataLayersStateService: DataLayersStateService,
    private newScenarioState: NewScenarioState
  ) {
    super();

    this.dataLayersStateService.setMaxSelectedLayers(MAX_SELECTABLE_LAYERS);
    this.dataLayersStateService.selectedDataLayers$
      .pipe(untilDestroyed(this))
      .subscribe((datalayers: DataLayer[]) => {
        this.form.patchValue({
          dataLayers: datalayers,
        });
        this.form.markAsTouched();
      });
  }

  handleRemoveItem(layer: any) {
    this.dataLayersStateService.removeSelectedLayer(layer);
  }

  getData() {
    const datalayers = this.form.getRawValue().dataLayers;
    return { priority_objectives: datalayers?.map((dl) => dl.id) ?? [] };
  }

  mapConfigToUI(): void {
    this.uiLoading = true;
    this.newScenarioState.priorityObjectivesDetails$
      .pipe(
        take(1),
        finalize(() => (this.uiLoading = false))
      )
      .subscribe((layers) => {
        this.form.get('dataLayers')?.setValue(layers);
        this.dataLayersStateService.updateSelectedLayers(layers);
      });
  }

  override beforeStepLoad() {
    this.dataLayersStateService.updateSelectedLayers([]);
    this.dataLayersStateService.setMaxSelectedLayers(MAX_SELECTABLE_LAYERS);
    this.dataLayersStateService.clearUnselectableLayers();
    this.newScenarioState.scenarioConfig$.pipe(take(1)).subscribe((config) => {
      if (config.cobenefits) {
        this.dataLayersStateService.setUnselectableLayers(
          config.cobenefits,
          'CO_BENEFIT'
        );
      }
    });
    this.mapConfigToUI();
  }

  override beforeStepExit(): void {
    this.dataLayersStateService.resetAll();
    this.dataLayersStateService.updateSelectedLayers([]);
  }
}
