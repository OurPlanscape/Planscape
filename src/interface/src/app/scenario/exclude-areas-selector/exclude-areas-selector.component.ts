import { Component, OnInit } from '@angular/core';
import { SectionComponent } from '@styleguide';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { StepDirective } from '../../../styleguide/steps/step.component';
import { IdNamePair, ScenarioCreation } from '@types';
import { NewScenarioState } from '../new-scenario.state';
import { ForsysService } from '@services/forsys.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { filter, take } from 'rxjs';
import { SelectableListComponent } from '../../../styleguide/selectable-list/selectable-list.component';

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
    private forsysService: ForsysService
  ) {
    super();
  }

  form = new FormGroup({}); // keeping the inheritance happy
  excludableAreas$ = this.forsysService.excludedAreas$;
  excludableAreas: IdNamePair[] = [];

  selectedAreas: IdNamePair[] = [];
  viewingAreas: IdNamePair[] = [];

  ngOnInit() {
    this.excludableAreas$.subscribe((areas) => {
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
      )
      .subscribe((config) => {
        this.selectedAreas = [];
        this.excludableAreas.forEach((area) => {
          if (config.excluded_areas?.includes(area.id)) {
            this.selectedAreas.push(area);
          }
        });
      });
  }

  handleSelectedItemsChange(selectedItems: IdNamePair[]) {
    this.selectedAreas = [];
    selectedItems.forEach((s) => {
      this.selectedAreas.push(s);
    });
    this.newScenarioState.setExcludedAreas(this.getSelectedExcludedAreaIds());
  }

  handleViewedItemsChange(viewedItems: IdNamePair[]) {
    this.viewingAreas = [];
    viewedItems.forEach((s) => {
      this.viewingAreas.push(s);
    });
  }

  getAreasBeingViewed(): number[] {
    return this.viewingAreas.map((a) => a.id);
  }

  getSelectedExcludedAreaIds(): number[] {
    return this.selectedAreas.map((s) => s.id);
  }

  getData() {
    return { excluded_areas: this.getSelectedExcludedAreaIds() };
  }
}
