import { Component } from '@angular/core';
import { SectionComponent, StepDirective } from '@styleguide';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DataLayersComponent } from 'src/app/data-layers/data-layers/data-layers.component';
import { ChipSelectorComponent } from 'src/styleguide/chip-selector/chip-selector.component';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';
import { DataLayer, ScenarioCreation } from '@types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

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
    this.dataLayersStateService.clearDataLayer();
    this.dataLayersStateService.updateSelectedLayers([]);
    return { cobenefits: datalayers?.map((layer) => layer.id) ?? [] };
  }
}
