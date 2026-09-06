import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { DataLayersComponent } from '@app/data-layers/data-layers/data-layers.component';
import { DataLayerSelectionComponent } from '@app/plan/climate-foresight/climate-foresight-run/data-layer-selection/data-layer-selection.component';
import { SectionComponent } from '@styleguide';
import {
  AdvStandLevelConstraintsModalComponent,
  NamedConstraint,
} from '../adv-stand-level-constraints-modal/adv-stand-level-constraints-modal.component';
import { BehaviorSubject, switchMap, take } from 'rxjs';
import { MapModuleService } from '@app/services/map-module.service';
import { DataLayer } from '@app/types';
import { MAP_MODULE_NAME } from '@app/services/map-module.token';
import { ScenarioState } from '@app/scenario/scenario.state';
import { PlanState } from '@app/plan/plan.state';
import { ChipSelectorComponent } from '@styleguide/chip-selector/chip-selector.component';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-adv-stand-level-constraints',
  standalone: true,
  providers: [{ provide: MAP_MODULE_NAME, useValue: 'constraints' }],
  imports: [
    ChipSelectorComponent,
    CommonModule,
    DataLayerSelectionComponent,
    DataLayersComponent,
    AdvStandLevelConstraintsModalComponent,
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

  constructor(
    private dialog: MatDialog,
    private mapModuleService: MapModuleService,
    private scenarioState: ScenarioState,
    private planState: PlanState
  ) {
    /// TODO: remove in favor of whatever module this should be
    // this.mapModuleService

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

  handleSelectedLayer(dl: DataLayer) {
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
      .subscribe((confirmed) => {
        if (confirmed) {
          this.handleConstraintAdded(confirmed);
        }
      });
  }

  toggleLayersSection() {
    this.showLayersPanel = !this.showLayersPanel;
  }

  handleConstraintClicked(e: Event) {
    // TODO:
    // mark item as selected in chip selector
    // open constraint dialog (and close current if open)

    console.log('clicked this:', e);
  }
}
