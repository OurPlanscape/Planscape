import { Component } from '@angular/core';
import { SectionComponent, StepDirective } from '@styleguide';
import { CommonModule, NgIf } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import { ChipSelectorComponent } from '@styleguide/chip-selector/chip-selector.component';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { DataLayer, ScenarioCreation } from '@types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DataLayersService } from '@services';
import { NewScenarioState } from '../new-scenario.state';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, finalize, map, of, switchMap, take } from 'rxjs';

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
    private dataLayersService: DataLayersService,
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
    this.newScenarioState.scenarioConfig$
      .pipe(
        untilDestroyed(this),
        take(1),
        switchMap((config) => {
          if (config.cobenefits) {
            const ids = config.cobenefits;
            return this.dataLayersService.getDataLayersByIds(ids).pipe(
              map((layers: DataLayer[]) => layers),
              catchError((error) => {
                throw error;
              })
            );
          }
          return of([]);
        }),
        finalize(() => (this.uiLoading = false))
      )
      .subscribe({
        next: (layers) => {
          this.form.get('dataLayers')?.setValue(layers);
          this.dataLayersStateService.updateSelectedLayers(layers);
        },
        error: (error) => {
          console.error('Error fetching datalayers ', error);
        },
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
    // ensure that priority_objective layers are unselectable
    this.newScenarioState.scenarioConfig$.pipe(take(1)).subscribe((config) => {
      if (config.priority_objectives) {
        this.dataLayersStateService.setUnselectableLayerIds(
          config.priority_objectives
        );
      }
    });
    this.mapConfigToUI();
  }

  override beforeStepExit() {
    this.dataLayersStateService.resetAll();
    this.dataLayersStateService.updateSelectedLayers([]);
  }
}
