import { Component } from '@angular/core';
import { SectionComponent, StepDirective } from '@styleguide';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DataLayersComponent } from 'src/app/data-layers/data-layers/data-layers.component';
import { ChipSelectorComponent } from 'src/styleguide/chip-selector/chip-selector.component';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';
import { ScenarioCreation, DataLayer } from '@types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NewScenarioState } from '../new-scenario.state';
import { of, map, take, switchMap } from 'rxjs';
import { DataLayersService } from '@services';

const MAX_SELECTABLE_LAYERS = 2;

@UntilDestroy()
@Component({
  selector: 'app-custom-priority-objectives',
  standalone: true,
  imports: [
    ChipSelectorComponent,
    CommonModule,
    DataLayersComponent,
    SectionComponent,
    ReactiveFormsModule,
  ],
  providers: [
    { provide: StepDirective, useExisting: CustomPriorityObjectivesComponent },
  ],
  templateUrl: './custom-priority-objectives.component.html',
  styleUrl: './custom-priority-objectives.component.scss',
})
export class CustomPriorityObjectivesComponent
  extends StepDirective<ScenarioCreation>
{
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

  handleRemoveItem(layer: any) {
    this.dataLayersStateService.removeSelectedLayer(layer);
  }

  getData() {
    const datalayers = this.form.getRawValue().dataLayers;
    return { priority_objectives: datalayers?.map((dl) => dl.id) ?? [] };
  }

  mapConfigToUI(): void {
    this.uiLoading = true;
    this.newScenarioState.scenarioConfig$
      .pipe(
        untilDestroyed(this),
        take(1),
        switchMap((config) => {
          if (config.priority_objectives) {
            const ids = config.priority_objectives;
            return this.dataLayersService
              .getDataLayersByIds(ids)
              .pipe(map((layers: DataLayer[]) => ({ config, layers })));
          }
          return of({ config, layers: [] });
        })
      )
      .subscribe(({ layers }) => {
        if (this.form.get('dataLayers')?.value) {
          this.form.get('dataLayers')?.setValue(layers);
          this.dataLayersStateService.updateSelectedLayers(layers);
          this.uiLoading = false;
        }
      });
  }

  override beforeStepLoad() {
    this.dataLayersStateService.setMaxSelectedLayers(MAX_SELECTABLE_LAYERS);
    this.mapConfigToUI();
  }

  override beforeStepExit(): void {
    this.dataLayersStateService.clearDataLayer();
    this.dataLayersStateService.updateSelectedLayers([]);
  }
}
