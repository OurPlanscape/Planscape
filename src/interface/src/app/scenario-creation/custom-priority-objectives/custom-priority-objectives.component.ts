import { Component, ViewChild } from '@angular/core';
import { ButtonComponent, SectionComponent, StepDirective } from '@styleguide';
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
import { finalize, map, take } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FeaturesModule } from '@features/features.module';
import { FeatureService } from '@features/feature.service';
import { PriorityWeightingComponent } from '@scenario-creation/priority-weighting/priority-weighting.component';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';

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
    FeaturesModule,
    ButtonComponent,
    PriorityWeightingComponent,
    MatMenuModule,
  ],
  providers: [
    { provide: StepDirective, useExisting: CustomPriorityObjectivesComponent },
  ],
  templateUrl: './custom-priority-objectives.component.html',
  styleUrl: './custom-priority-objectives.component.scss',
})
export class CustomPriorityObjectivesComponent extends StepDirective<ScenarioDraftConfiguration> {
  @ViewChild(MatMenuTrigger) weightingMenuTrigger?: MatMenuTrigger;

  form = new FormGroup({
    dataLayers: new FormControl<DataLayer[]>(
      [],
      [Validators.required, Validators.minLength(1)]
    ),
  });

  uiLoading = false;

  selectionCount$ = this.dataLayersStateService.selectedLayersCount$;

  hasMoreThanOneSelected$ = this.selectionCount$.pipe(
    map((count) => count > 1)
  );

  selectedItems$ = this.dataLayersStateService.selectedDataLayers$;

  weightingItems$ = this.selectedItems$.pipe(
    map((layers) => layers.map((l) => ({ name: l.name, value: 1 })))
  );

  maxLayers = MAX_SELECTABLE_LAYERS;

  constructor(
    private dataLayersStateService: DataLayersStateService,
    private newScenarioState: NewScenarioState,
    private featureService: FeatureService
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

  closeWeightingMenu() {
    this.weightingMenuTrigger?.closeMenu();
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

  get weightingFlagOn() {
    return this.featureService.isFeatureEnabled('PRIORITY_OBJECTIVE_WEIGHTING');
  }
}
