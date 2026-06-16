import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { BaseLayer, ScenarioDraftConfiguration } from '@app/types';
import { SectionComponent, StepDirective } from '@styleguide';
import { SelectableListComponent } from '@styleguide/selectable-list/selectable-list.component';
import { filter, map, switchMap, take } from 'rxjs';
import { NewScenarioState } from '../new-scenario.state';
import { ForsysService } from '@app/services/forsys.service';
import { BaseLayersStateService } from '@app/base-layers/base-layers.state.service';

@Component({
  selector: 'app-include-areas-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatCheckboxModule,
    SectionComponent,
    ReactiveFormsModule,
    SelectableListComponent,
  ],
  providers: [
    { provide: StepDirective, useExisting: IncludeAreasSelectorComponent },
  ],
  templateUrl: './include-areas-selector.component.html',
  styleUrl: './include-areas-selector.component.scss',
})
export class IncludeAreasSelectorComponent
  extends StepDirective<ScenarioDraftConfiguration>
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

  form = new FormGroup({});
  includableAreas$ = this.forsysService.includedAreas$.pipe(
    map((areas) => areas.sort((a, b) => a.name.localeCompare(b.name)))
  );
  loadingAreas$ = this.baseLayersStateService.loadingLayers$;
  selectedAreas: BaseLayer[] = [];
  viewingAreas: BaseLayer[] = [];

  ngOnInit() {
    this.prefillIncludedAreas();
  }

  private prefillIncludedAreas() {
    this.newScenarioState.scenarioConfig$
      .pipe(
        filter((c) => !!c?.included_areas),
        take(1),
        switchMap((config) =>
          this.forsysService.includedAreas$.pipe(
            take(1),
            map((includableAreas: BaseLayer[]) =>
              includableAreas.filter((ia) =>
                config.included_areas?.includes(ia.id)
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
    // TODO: Update this for setIncludedAreas before releasing ADD_INCLUDES
    this.newScenarioState.setIncludedAreas(this.getSelectedIncluedAreaIds());
  }

  getSelectedIncluedAreaIds(): number[] {
    return this.selectedAreas.map((s) => s.id);
  }

  handleViewedItemsChange(viewedItems: BaseLayer[]) {
    this.replaceViewingLayers([...viewedItems]);
  }

  getData() {
    return { included_areas: this.getSelectedIncluedAreaIds() };
  }

  clearViewedLayers() {
    this.baseLayersStateService.enableBaseLayerHover(false);
    this.replaceViewingLayers([]);
  }

  private replaceViewingLayers(next: BaseLayer[]) {
    const currentViewingIds = new Set(this.viewingAreas.map((l) => l.id));
    this.viewingAreas = next;
    this.baseLayersStateService.selectedBaseLayers$
      .pipe(take(1))
      .subscribe((layers) => {
        const persistent = (layers ?? []).filter(
          (l) => !currentViewingIds.has(l.id)
        );
        this.baseLayersStateService.setBaseLayers([...persistent, ...next]);
      });
  }

  override beforeStepExit(): void {
    this.clearViewedLayers(); // clears layer selection after step in completed
    // Revert any unsaved selection so going back doesn't persist changes.
    // On save this is a no-op since the config was already updated.
    this.newScenarioState.scenarioConfig$
      .pipe(take(1))
      .subscribe((config) =>
        this.newScenarioState.setIncludedAreas(config.included_areas ?? [])
      );
  }
}
