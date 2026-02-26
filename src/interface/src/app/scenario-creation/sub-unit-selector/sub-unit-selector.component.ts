import { Component } from '@angular/core';
import { SectionComponent } from '@styleguide';
import { CommonModule } from '@angular/common';
import {
  FormGroup,
  ReactiveFormsModule,
  FormControl,
  Validators,
} from '@angular/forms';
import { StepDirective } from '@styleguide';
import { filter, map, Observable, switchMap, take } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { BaseLayer, DataSet, ScenarioDraftConfiguration } from '@app/types';
import { NewScenarioState } from '../new-scenario.state';
import { DataLayersService } from '@app/services';
import { BaseLayersStateService } from '@app/base-layers/base-layers.state.service';

@Component({
  selector: 'app-sub-unit-selector',
  templateUrl: './sub-unit-selector.component.html',
  styleUrl: './sub-unit-selector.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    ReactiveFormsModule,
    SectionComponent,
  ],
  providers: [
    { provide: StepDirective, useExisting: SubUnitSelectorComponent },
  ],
})
export class SubUnitSelectorComponent extends StepDirective<ScenarioDraftConfiguration> {
  constructor(
    private dataLayersService: DataLayersService,
    private newScenarioState: NewScenarioState,
    private baseLayersStateService: BaseLayersStateService
  ) {
    super();
  }

  form = new FormGroup({
    sub_units_layer: new FormControl<number | undefined>(undefined, [
      Validators.required,
    ]),
  });

  subUnitLayerOptions$: Observable<BaseLayer[]> = this.dataLayersService
    .listDataSets()
    .pipe(
      map((datasets) =>
        datasets.results.find((ds) => ds.name === 'Boundaries')
      ),
      filter(
        (matchingDataSet): matchingDataSet is DataSet => !!matchingDataSet
      ),
      switchMap((matchingDataSet) =>
        this.dataLayersService.listBaseLayersByDataSet(matchingDataSet?.id, '')
      )
    );

  loadingLayers$ = this.baseLayersStateService.loadingLayers$;
  selectedSubUnit: number | null = null;

  getData() {
    return this.form.value;
  }

  onSubunitSelect(e: any) {
    this.baseLayersStateService.updateBaseLayers(e.value, false);
  }

  override beforeStepLoad(): void {
    this.newScenarioState.scenarioConfig$.pipe(take(1)).subscribe((config) => {
      if (config.sub_units_layer) {
        this.selectedSubUnit = config.sub_units_layer;
      }
    });
    this.form.controls['sub_units_layer'].setValue(this.selectedSubUnit);
  }

  override beforeStepExit(): void {
    this.baseLayersStateService.clearBaseLayer();
  }
}
