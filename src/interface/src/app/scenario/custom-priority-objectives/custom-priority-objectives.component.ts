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
export class CustomPriorityObjectivesComponent extends StepDirective<ScenarioCreation> {
  form = new FormGroup({
    dataLayers: new FormControl<DataLayer[]>(
      [],
      [Validators.required, Validators.minLength(1)]
    ),
  });

  selectionCount$ = this.dataLayersStateService.selectedLayersCount$;

  selectedItems$ = this.dataLayersStateService.selectedDataLayers$;

  maxLayers = MAX_SELECTABLE_LAYERS;

  constructor(private dataLayersStateService: DataLayersStateService) {
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

  override beforeStepExit(): void {
    this.dataLayersStateService.clearDataLayer();
    this.dataLayersStateService.updateSelectedLayers([]);
  }
}
