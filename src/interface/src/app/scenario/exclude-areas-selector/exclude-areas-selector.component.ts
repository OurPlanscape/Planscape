import { Component, OnInit } from '@angular/core';
import { SectionComponent } from '@styleguide';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { StepDirective } from '../../../styleguide/steps/step.component';
import { BaseLayer, IdNamePair, ScenarioCreation } from '@types';
import { NewScenarioState } from '../new-scenario.state';
import { ForsysService } from '@services/forsys.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { filter, take } from 'rxjs';
import { SelectableListComponent } from '../../../styleguide/selectable-list/selectable-list.component';
import { BaseLayersStateService } from 'src/app/base-layers/base-layers.state.service';

@UntilDestroy()
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
  implements OnInit
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
  excludableAreas: BaseLayer[] = [];

  selectedAreas: IdNamePair[] = [];
  viewingAreas: IdNamePair[] = [];

  ngOnInit() {
    this.forsysService.excludedAreas$.pipe(take(1)).subscribe((areas) => {
      this.excludableAreas = areas;
      this.prefillExcludedAreas();
    });
  }

  private prefillExcludedAreas() {
    // Reading the config from the scenario state
    this.newScenarioState.scenarioConfig$
      .pipe(
        untilDestroyed(this),
        filter((c) => !!c?.excluded_areas),
        take(1)
      ) // set the local selectedAreas to what was read from the config
      .subscribe((config) => {
        this.selectedAreas = this.excludableAreas.filter((ea) =>
          config.excluded_areas?.includes(ea.id)
        );
      });
  }

  handleSelectedItemsChange(selectedItems: IdNamePair[]) {
    this.selectedAreas = [...selectedItems];
    this.newScenarioState.setExcludedAreas(this.getSelectedExcludedAreaIds());
  }

  getSelectedExcludedAreaIds(): number[] {
    return this.selectedAreas.map((s) => s.id);
  }

  handleViewedItemsChange(viewedItems: IdNamePair[]) {
    this.viewingAreas = [...viewedItems];
    const baseLayersToView = this.excludableAreas.filter((ea) =>
      viewedItems.some((vi) => vi.id === ea.id)
    );
    this.baseLayersStateService.setBaseLayers(baseLayersToView);
  }

  getData() {
    return { excluded_areas: this.getSelectedExcludedAreaIds() };
  }
}
