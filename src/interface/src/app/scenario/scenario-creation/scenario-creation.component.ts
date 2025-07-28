import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { AsyncPipe, NgIf } from '@angular/common';
import { MatLegacyButtonModule } from '@angular/material/legacy-button';
import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';
import { StepsComponent } from '../../../styleguide/steps/steps.component';
import { CdkStepperModule } from '@angular/cdk/stepper';

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
export class ScenarioCreationComponent {}
