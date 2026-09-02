import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { DataLayersComponent } from '@app/data-layers/data-layers/data-layers.component';
import { DataLayerSelectionComponent } from '@app/plan/climate-foresight/climate-foresight-run/data-layer-selection/data-layer-selection.component';
import { SectionComponent } from '@styleguide';
import { AdvStandLevelConstraintsModalComponent } from '../adv-stand-level-constraints-modal/adv-stand-level-constraints-modal.component';
import { switchMap, take } from 'rxjs';
import { MapModuleService } from '@app/services/map-module.service';
import { DataLayer } from '@app/types';
import { MAP_MODULE_NAME } from '@app/services/map-module.token';
import { ScenarioState } from '@app/scenario/scenario.state';
import { PlanState } from '@app/plan/plan.state';

@Component({
  selector: 'app-adv-stand-level-constraints',
  standalone: true,
  providers: [
    { provide: MAP_MODULE_NAME, useValue: 'constraints' },
  ],
  imports: [
    CommonModule,
    DataLayerSelectionComponent,
    DataLayersComponent,
    AdvStandLevelConstraintsModalComponent,
    SectionComponent,
    MatExpansionModule,
  ],
  templateUrl: './adv-stand-level-constraints.component.html',
  styleUrl: './adv-stand-level-constraints.component.scss',
})
export class AdvStandLevelConstraintsComponent {
  constructor(private dialog: MatDialog,
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

  handleSelectedLayer(dl: DataLayer) {
    const dialogRef = this.dialog.open(AdvStandLevelConstraintsModalComponent, {
      maxWidth: '560px',
      data: { dataLayerName: dl.name },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          console.log('here is the result:', confirmed);
          // store the constraint
        }
      });
  }



  openConstraintModal() {
    const dialogRef = this.dialog.open(AdvStandLevelConstraintsModalComponent, {
      maxWidth: '560px',
      data: { dataLayerName: 'Data Layer Name' },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          console.log('here is the result:', confirmed);
          // store the constraint
        }
      });
  }
}
