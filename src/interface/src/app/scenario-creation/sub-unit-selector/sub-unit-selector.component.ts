import { Component } from '@angular/core';
import { SectionComponent } from '@styleguide';
import { CommonModule } from '@angular/common';
import {
  FormGroup,
  ReactiveFormsModule,
  FormControl,
  Validators,
} from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { StepDirective } from '../../../styleguide/steps/step.component';
import { SelectableListComponent } from '../../../styleguide/selectable-list/selectable-list.component';
import { Observable, of, take } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { BaseLayer, ScenarioDraftConfiguration } from '@app/types';
import { NewScenarioState } from '../new-scenario.state';
import { DataLayersService } from '@app/services';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';


@Component({
  selector: 'app-sub-unit-selector',
  templateUrl: './sub-unit-selector.component.html',
  styleUrl: './sub-unit-selector.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    ReactiveFormsModule,
    SectionComponent,
    SelectableListComponent,
  ],
  providers: [
    { provide: StepDirective, useExisting: SubUnitSelectorComponent },
  ],
})
export class SubUnitSelectorComponent extends  StepDirective<ScenarioDraftConfiguration>
 {
  constructor(
    private dataLayersService: DataLayersService,
    private newScenarioState: NewScenarioState,
    private dataLayerStateService: DataLayersStateService,
  ) {
    super();
  }

  form = new FormGroup({
    sub_units_layer: new FormControl<number | undefined>(undefined, [
      Validators.required,
    ]),
  });

  //TODO...remove placeholder
  subUnitLayerOptions$: Observable<BaseLayer[]> = this.dataLayersService.listBaseLayersByDataSet(1057,'');

  loadingItems$ = of(false);
  selectedSubUnit : number | null = null;

  getData() {
    return this.form.value;
  }

  onSubunitSelect(e:any ) {
    this.dataLayerStateService.selectDataLayer(e);
  }

  override beforeStepLoad(): void {
    //get the current config...
    
    this.newScenarioState.scenarioConfig$.pipe(take(1)).subscribe((config) => {
  
  if (config.sub_units_layer) {
        this.selectedSubUnit = config.sub_units_layer;
      }
    });
    //set current form value
    this.form.controls['sub_units_layer'].setValue( this.selectedSubUnit);
    // this.dataLayersStateService.selectDataLayer();
  }

  override beforeStepExit(): void {}
}
