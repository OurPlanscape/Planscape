import { Component } from '@angular/core';
import { ScenarioState } from 'src/app/scenario/scenario.state';
import { takeWhile } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AsyncPipe, NgIf } from '@angular/common';
import { ResourceUnavailableComponent } from '../../shared/resource-unavailable/resource-unavailable.component';
import { UploadedScenarioViewComponent } from '../uploaded-scenario-view/uploaded-scenario-view.component';
import { ViewScenarioComponent } from '../view-scenario/view-scenario.component';

@Component({
  standalone: true,
  imports: [
    NgIf,
    ResourceUnavailableComponent,
    AsyncPipe,
    MatProgressSpinnerModule,
    UploadedScenarioViewComponent,
    ViewScenarioComponent,
  ],
  selector: 'app-scenario-route-placeholder',
  templateUrl: './scenario-route-placeholder.component.html',
  styleUrl: './scenario-route-placeholder.component.scss',
})
export class ScenarioRoutePlaceholderComponent {
  currentScenarioResource$ = this.scenarioState.currentScenarioResource$.pipe(
    // complete this stream after the resource is loaded.
    takeWhile((resource) => resource.isLoading, true)
  );

  constructor(private scenarioState: ScenarioState) {}
}
