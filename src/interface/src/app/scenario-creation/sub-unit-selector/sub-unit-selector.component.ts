import { Component } from '@angular/core';
import { SectionComponent } from '@styleguide';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { StepDirective } from '../../../styleguide/steps/step.component';
import { ScenarioCreation } from '@types';
import { SelectableListComponent } from '../../../styleguide/selectable-list/selectable-list.component';
import { BaseLayersStateService } from '../../base-layers/base-layers.state.service';

@Component({
  selector: 'app-sub-unit-selector',
  templateUrl: './sub-unit-selector.component.html',
  styleUrl: './sub-unit-selector.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MatCheckboxModule,
    SectionComponent,
    ReactiveFormsModule,
    SelectableListComponent,
  ],
  providers: [
    { provide: StepDirective, useExisting: SubUnitSelectorComponent },
  ],
})
export class SubUnitSelectorComponent
  extends StepDirective<ScenarioCreation> {
  constructor(
    private baseLayersStateService: BaseLayersStateService
  ) {
    baseLayersStateService.enableBaseLayerHover(false);
    super();
  }

  form = new FormGroup({}); // keeping the inheritance happy

  //TODO...
  //  subUnitTypes$ // 

  loadingItems$ = this.baseLayersStateService.loadingLayers$;

  getData() {
    return {}; // TODO: this is a placeholder
  }

  override beforeStepLoad(): void {
    //
  }

  override beforeStepExit(): void {
  }
}