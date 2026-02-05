import { Component } from '@angular/core';
import { SectionComponent, StepDirective } from '@styleguide';
import { CommonModule, NgIf } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import { ChipSelectorComponent } from '@styleguide/chip-selector/chip-selector.component';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { DataLayer, ScenarioCreation } from '@types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NewScenarioState } from '../new-scenario.state';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize, take } from 'rxjs';

const MAX_SELECTABLE_LAYERS = 10;

@UntilDestroy()
@Component({
  selector: 'app-custom-cobenefits',
  standalone: true,
  templateUrl: './custom-cobenefits.component.html',
  styleUrl: './custom-cobenefits.component.scss',
  imports: [
    ChipSelectorComponent,
    CommonModule,
    DataLayersComponent,
    MatProgressSpinnerModule,
    NgIf,
    SectionComponent,
    ReactiveFormsModule,
  ],
  providers: [
    { provide: StepDirective, useExisting: CustomCobenefitsComponent },
  ],
})
export class CustomCobenefitsComponent extends StepDirective<ScenarioCreation> {
  form = new FormGroup({
    dataLayers: new FormControl<DataLayer[]>([]),
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

  mapConfigToUI(): void {
    this.uiLoading = true;
    this.newScenarioState.coBenefitsDetails$
      .pipe(
        untilDestroyed(this),
        take(1),
        finalize(() => (this.uiLoading = false))
      )
      .subscribe((layers) => {
        this.form.get('dataLayers')?.setValue(layers);
        this.dataLayersStateService.updateSelectedLayers(layers);
      });
  }

  handleRemoveItem(layer: any) {
    this.dataLayersStateService.removeSelectedLayer(layer);
  }

  getData() {
    const datalayers = this.form.getRawValue().dataLayers;
    return { cobenefits: datalayers?.map((layer) => layer.id) ?? [] };
  }

  override beforeStepLoad() {
    this.dataLayersStateService.updateSelectedLayers([]);
    this.dataLayersStateService.setMaxSelectedLayers(MAX_SELECTABLE_LAYERS);
    this.mapConfigToUI();
  }

  override beforeStepExit() {
    this.dataLayersStateService.resetAll();
    this.dataLayersStateService.updateSelectedLayers([]);
  }
}
