import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { DataLayersComponent } from '@app/data-layers/data-layers/data-layers.component';
import { SectionComponent } from '@styleguide';
import {
  AdvStandLevelConstraintsModalComponent,
  NamedConstraint,
} from '../adv-stand-level-constraints-modal/adv-stand-level-constraints-modal.component';
import { BehaviorSubject, map, Observable, switchMap, take } from 'rxjs';
import { MapModuleService } from '@app/services/map-module.service';
import { ApiModule, DataLayer, AdvStandLevelConstraintData } from '@app/types';
import { MAP_MODULE_NAME } from '@app/services/map-module.token';
import { ScenarioState } from '@app/scenario/scenario.state';
import { PlanState } from '@app/plan/plan.state';
import { ChipSelectorComponent } from '@styleguide/chip-selector/chip-selector.component';
import { MatIconModule } from '@angular/material/icon';
import { ModuleService } from '@app/services/module.service';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { MAX_SELECTED_DATALAYERS } from '@app/data-layers/data-layers/max-selected-datalayers.token';
import { SELECTION_MODE } from '@app/data-layers/data-layers/selection-mode.token';

@Component({
  selector: 'app-adv-stand-level-constraints',
  standalone: true,
  providers: [
    DataLayersStateService,
    { provide: SELECTION_MODE, useValue: 'MANUAL' },
    { provide: MAX_SELECTED_DATALAYERS, useValue: Number.POSITIVE_INFINITY }, // TODO: should have a no-limit option -- 0 or null?
    MapModuleService,
    { provide: MAP_MODULE_NAME, useValue: 'advanced_stand_level_constraint' },
  ],
  imports: [
    ChipSelectorComponent,
    CommonModule,
    DataLayersComponent,
    SectionComponent,
    MatExpansionModule,
    MatIconModule,
  ],
  templateUrl: './adv-stand-level-constraints.component.html',
  styleUrl: './adv-stand-level-constraints.component.scss',
})
export class AdvStandLevelConstraintsComponent {
  selectedConstraints$ = new BehaviorSubject<NamedConstraint[]>([]);

  showLayersPanel = false;

  constraintLayers$: Observable<DataLayer[]> = this.moduleService
    .getModule<
      ApiModule<AdvStandLevelConstraintData>
    >('advanced_stand_level_constraint')
    .pipe(
      map((data: ApiModule<AdvStandLevelConstraintData>) => {
        return data.options.datalayers;
      })
    );

  constructor(
    private dialog: MatDialog,
    private moduleService: ModuleService,
    private mapModuleService: MapModuleService,
    private scenarioState: ScenarioState,
    private planState: PlanState
  ) {
    this.scenarioState.currentScenario$
      .pipe(
        take(1),
        switchMap(() => this.planState.currentPlan$),
        switchMap((plan) => this.mapModuleService.loadMapModule(plan.geometry))
      )
      .subscribe();
  }

  public handleConstraintAdded(constraint: NamedConstraint): void {
    const current = [...this.selectedConstraints$.value];
    const existingIndex = current.findIndex((c) => c.name === constraint.name);

    if (existingIndex === -1) {
      current.push(constraint);
    } else {
      current[existingIndex] = constraint;
    }
    this.selectedConstraints$.next(current);
  }

  removeSelectionById(id: number) {
    console.log('id to remove:', id);
    const currentSelections = this.selectedConstraints$.value;
    console.log('current seelctions before:', currentSelections);
    const updatedItems = currentSelections.filter(item => item.datalayer !== id);
    console.log('current seelctions after:', updatedItems);
    this.selectedConstraints$.next(updatedItems);
  }

  handleSelectedLayer(dl: DataLayer) {

    console.log('clicked this:', dl);
    // CHECK if the layer is in our current constraint list.
    const currentSelections = this.selectedConstraints$.value;
    if (currentSelections.some(curSel => curSel.datalayer === dl.id)) {
      // then just remove it...
      this.removeSelectionById(dl.id);
    } else {

      const dialogRef = this.dialog.open(AdvStandLevelConstraintsModalComponent, {
        maxWidth: '560px',
        data: {
          dataLayerName: dl.name,
          dataLayer: dl,
        },
      });

      dialogRef
        .afterClosed()
        .pipe(take(1))
        .subscribe((closeResult) => {
          if (closeResult.action === 'SAVE') {
            this.handleConstraintAdded(closeResult.payload);
          } else if (closeResult.action === 'DELETE') {
            console.log('we want to delete the thing?:', closeResult);
          this.removeSelectionById(closeResult.payload)
          }
        });
    }
  }

  toggleLayersSection() {
    this.showLayersPanel = !this.showLayersPanel;
  }


  handleConstraintChipClicked(e: NamedConstraint) {
    // TODO:
    // get the known layers by Id
    // mark item as selected in chip selector
    // open constraint dialog (and close current if open)
    console.log('here, we open the dialog, complete with the data');


    // TODO: we need to convert these types, so we can fill elements of the dialot
    // but we should consolidate this 

    const dialogRef = this.dialog.open(AdvStandLevelConstraintsModalComponent, {
      maxWidth: '560px',
      data: {
        mode: 'EDIT',
        dataLayerName: e.name,
        dataLayer: e,
        operator: e.operator,
        valueOne: e.value,
        valueTwo: e.value2
      },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((closeResult) => {
        if (closeResult.action === 'SAVE') {
          this.handleConstraintAdded(closeResult.payload);
        } else if (closeResult.action === 'DELETE') {
          console.log('we want to delete the thing????:', closeResult.payload);
          console.log('this should be the layerId, right?:', closeResult.payload.datalayer);
          this.removeSelectionById(closeResult.payload.datalayer)
        }
      });
  }
}
