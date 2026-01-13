import { Component, OnInit } from '@angular/core';
import { SectionComponent, StepDirective } from '@styleguide';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DataLayersComponent } from 'src/app/data-layers/data-layers/data-layers.component';
import { ChipSelectorComponent } from 'src/styleguide/chip-selector/chip-selector.component';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';
import { MAX_SELECTED_DATALAYERS } from 'src/app/data-layers/data-layers/max-selected-datalayers.token';
import { ScenarioCreation } from '@types';

const MAX_SELECTABLE_LAYERS = 2;

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
    { provide: MAX_SELECTED_DATALAYERS, useValue: MAX_SELECTABLE_LAYERS },
    DataLayersStateService,
  ],
  templateUrl: './custom-priority-objectives.component.html',
  styleUrl: './custom-priority-objectives.component.scss',
})
export class CustomPriorityObjectivesComponent
  extends StepDirective<ScenarioCreation>
  implements OnInit
{
  form = new FormGroup({});
  selectionCount$ = this.dataLayersStateService.selectedLayersCount$;

  selectedItems$ = this.dataLayersStateService.selectedDataLayers$;

  maxLayers = MAX_SELECTABLE_LAYERS;

  constructor(private dataLayersStateService: DataLayersStateService) {
    super();
  }

  handleRemoveItem(layer: any) {
    this.dataLayersStateService.removeSelectedLayer(layer);
  }

  ngOnInit(): void {}

  getData() {
    return this.form.value;
  }
}
