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
import { BehaviorSubject, combineLatest, finalize, map, take } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FeaturesModule } from '@features/features.module';
import {
  AppliedWeight,
  PriorityWeightingComponent,
} from '@scenario-creation/priority-weighting/priority-weighting.component';
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

  private weights$ = new BehaviorSubject<Record<number, number>>({});

  selectionCount$ = this.dataLayersStateService.selectedLayersCount$;

  hasMoreThanOneSelected$ = this.selectionCount$.pipe(
    map((count) => count > 1)
  );

  selectedItems$ = this.dataLayersStateService.selectedDataLayers$;

  selectedItemsWithWeights$ = combineLatest([
    this.selectedItems$,
    this.weights$,
  ]).pipe(
    map(([layers, weights]) =>
      layers.map((l) => ({ ...l, weight: weights[l.id] ?? 1 }))
    )
  );

  weightingItems$ = this.selectedItemsWithWeights$.pipe(
    map((layers) =>
      layers.map((l) => ({ id: l.id, name: l.name, value: l.weight }))
    )
  );

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
        this.syncWeightsWithSelection(datalayers);
      });
  }

  private syncWeightsWithSelection(layers: DataLayer[]) {
    const current = this.weights$.value;
    const next: Record<number, number> = {};
    for (const l of layers) {
      next[l.id] = current[l.id] ?? 1;
    }
    this.weights$.next(next);
  }

  onWeightsApplied(updates: AppliedWeight[]) {
    const next = { ...this.weights$.value };
    for (const u of updates) {
      next[u.id] = u.value;
    }
    this.weights$.next(next);
  }

  handleRemoveItem(layer: any) {
    this.dataLayersStateService.removeSelectedLayer(layer);
  }

  closeWeightingMenu() {
    this.weightingMenuTrigger?.closeMenu();
  }

  getData() {
    const datalayers = this.form.getRawValue().dataLayers ?? [];
    const weights = this.weights$.value;
    return {
      priorities: datalayers.map((dl) => ({
        datalayer: dl.id,
        weight: weights[dl.id] ?? 1,
      })),
    };
  }

  mapConfigToUI(): void {
    this.uiLoading = true;
    this.newScenarioState.prioritiesDetails$
      .pipe(
        take(1),
        finalize(() => (this.uiLoading = false))
      )
      .subscribe((entries) => {
        const layers = entries.map((e) => e.layer);
        const weights: Record<number, number> = {};
        for (const e of entries) {
          weights[e.layer.id] = e.weight;
        }
        this.weights$.next(weights);
        this.form.get('dataLayers')?.setValue(layers);
        this.dataLayersStateService.updateSelectedLayers(layers);
      });
    return;
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
    this.weights$.next({});
  }
}
