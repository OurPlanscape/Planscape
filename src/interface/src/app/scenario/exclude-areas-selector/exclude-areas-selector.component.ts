import { Component, OnDestroy, OnInit } from '@angular/core';
import { SectionComponent } from '@styleguide';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { StepDirective } from '../../../styleguide/steps/step.component';
import { BaseLayer, ScenarioCreation } from '@types';
import { NewScenarioState } from '../new-scenario.state';
import { ForsysService } from '@services/forsys.service';
import { filter, switchMap, map, take } from 'rxjs';
import { SelectableListComponent } from '../../../styleguide/selectable-list/selectable-list.component';
import { BaseLayersStateService } from 'src/app/base-layers/base-layers.state.service';

@Component({
  selector: 'app-exclude-areas-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatCheckboxModule,
    SectionComponent,
    ReactiveFormsModule,
    SelectableListComponent,
  ],
  providers: [
    { provide: StepDirective, useExisting: ExcludeAreasSelectorComponent },
  ],

  templateUrl: './exclude-areas-selector.component.html',
  styleUrl: './exclude-areas-selector.component.scss',
})
export class ExcludeAreasSelectorComponent
  extends StepDirective<ScenarioCreation>
  implements OnInit, OnDestroy
{
  constructor(
    private newScenarioState: NewScenarioState,
    private forsysService: ForsysService,
    private baseLayersStateService: BaseLayersStateService
  ) {
    baseLayersStateService.enableBaseLayerHover(false);
    super();
  }

  form = new FormGroup({}); // keeping the inheritance happy
  // excludedAreas here are the list of available exclusion areas
  excludableAreas$ = this.forsysService.excludedAreas$;
  selectedAreas: BaseLayer[] = [];
  viewingAreas: BaseLayer[] = [];

  ngOnInit() {
    this.prefillExcludedAreas;
  }

  private prefillExcludedAreas() {
    this.newScenarioState.scenarioConfig$
      .pipe(
        filter((c) => !!c?.excluded_areas),
        take(1),
        switchMap((config) =>
          this.forsysService.excludedAreas$.pipe(
            take(1),
            map((excludableAreas: BaseLayer[]) =>
              excludableAreas.filter((ea) =>
                config.excluded_areas?.includes(ea.id)
              )
            )
          )
        )
      )
      .subscribe((selectedAreas: BaseLayer[]) => {
        this.selectedAreas = selectedAreas;
      });
  }

  handleSelectedItemsChange(selectedItems: BaseLayer[]) {
    this.selectedAreas = [...selectedItems];
    this.newScenarioState.setExcludedAreas(this.getSelectedExcludedAreaIds());
  }

  getSelectedExcludedAreaIds(): number[] {
    return this.selectedAreas.map((s) => s.id);
  }

  handleViewedItemsChange(viewedItems: BaseLayer[]) {
    this.viewingAreas = [...viewedItems];
    this.baseLayersStateService.setBaseLayers(viewedItems);
  }

  getData() {
    this.clearViewedLayers(); // clears layer selection after step in completed
    return { excluded_areas: this.getSelectedExcludedAreaIds() };
  }

  ngOnDestroy(): void {
    this.clearViewedLayers();
  }

  clearViewedLayers() {
    let layersToShow: BaseLayer[] = [];
    this.baseLayersStateService.enableBaseLayerHover(false);
    // remove only the layers that were viewed here
    this.baseLayersStateService.selectedBaseLayers$
      .pipe(take(1))
      .subscribe((layers) => {
        layersToShow =
          layers?.filter((item) => !this.viewingAreas.includes(item)) ?? [];
      });
    this.baseLayersStateService.setBaseLayers(layersToShow);
    this.viewingAreas = [];
  }
}
