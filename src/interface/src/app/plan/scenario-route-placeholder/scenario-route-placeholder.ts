import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { CreateScenariosComponent } from '../create-scenarios/create-scenarios.component';
import { UploadedScenarioViewComponent } from '../uploaded-scenario-view/uploaded-scenario-view.component';
import { Scenario } from '@types';
import { filter, map } from 'rxjs';
import { ScenarioState } from 'src/app/maplibre-map/scenario.state';

@Component({
  selector: 'app-scenario-route-placeholder',
  templateUrl: './scenario-route-placeholder.component.html',
  styleUrl: './scenario-route-placeholder.component.scss',
})
export class ScenarioRoutePlaceholderComponent implements OnInit {
  @ViewChild('container', { read: ViewContainerRef })
  container!: ViewContainerRef;

  constructor(private scenarioState: ScenarioState) {}

  scenario?: Scenario;
  scenarioNotFound = false;

  ngOnInit() {
    this.scenarioState.currentScenarioResource$
      .pipe(
        filter((resource) => !resource.isLoading),
        map((resource) => {
          if (resource.error) {
            this.scenarioNotFound = true;
          } else {
            this.scenario = resource.data;
            if (this.scenario?.origin === 'USER') {
              const factory = this.container.createComponent(
                UploadedScenarioViewComponent
              );
              factory.instance.scenario = this.scenario;
            } else {
              this.container.createComponent(CreateScenariosComponent);
            }
            if (this.scenario?.origin === 'USER') {
              const factory = this.container.createComponent(
                UploadedScenarioViewComponent
              );
              factory.instance.scenario = this.scenario;
            } else {
              this.container.createComponent(CreateScenariosComponent);
            }
          }
        })
      )
      .subscribe();
  }
}
