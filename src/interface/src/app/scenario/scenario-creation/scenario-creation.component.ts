import { Component, ViewChild } from '@angular/core';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { AsyncPipe, NgIf } from '@angular/common';
import { MatLegacyButtonModule } from '@angular/material/legacy-button';
import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';
import { StepsComponent } from '../../../styleguide/steps/steps.component';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { skip } from 'rxjs';
import { DataLayersStateService } from '../../data-layers/data-layers.state.service';

enum ScenarioTabs {
  CONFIG,
  DATA_LAYERS,
}

@UntilDestroy()
@Component({
  selector: 'app-scenario-creation',
  standalone: true,
  imports: [
    MatTabsModule,
    AsyncPipe,
    MatLegacyButtonModule,
    NgIf,
    DataLayersComponent,
    StepsComponent,
    CdkStepperModule,
  ],
  templateUrl: './scenario-creation.component.html',
  styleUrl: './scenario-creation.component.scss',
})
export class ScenarioCreationComponent {
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  constructor(private dataLayersStateService: DataLayersStateService) {
    this.dataLayersStateService.paths$
      .pipe(untilDestroyed(this), skip(1))
      .subscribe((path) => {
        if (path.length > 0) {
          this.tabGroup.selectedIndex = ScenarioTabs.DATA_LAYERS;
        }
      });
  }
}
