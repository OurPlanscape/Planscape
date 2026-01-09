import { Component } from '@angular/core';
import { SectionComponent } from '@styleguide';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DataLayersComponent } from 'src/app/data-layers/data-layers/data-layers.component';
import { ChipSelectorComponent } from 'src/styleguide/chip-selector/chip-selector.component';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';

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
  templateUrl: './custom-priority-objectives.component.html',
  styleUrl: './custom-priority-objectives.component.scss',
})
export class CustomPriorityObjectivesComponent {
  form = new FormGroup({}); // keeping the inheritance happy
  selectionCount$ = this.dataLayersStateService.selectedLayersCount$;

  selectedItems$ = this.dataLayersStateService.selectedDataLayers$;

  //TODO: use a separate instance of this
  constructor(private dataLayersStateService: DataLayersStateService) {}

  handleRemoveItem(layer: any) {
    console.log('okay so we called a thing....and we want to remove this:', layer);
    this.dataLayersStateService.removeSelectedLayer(layer);
  }

}
