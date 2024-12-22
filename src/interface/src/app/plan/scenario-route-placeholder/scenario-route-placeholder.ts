import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CreateScenariosComponent } from '../create-scenarios/create-scenarios.component';
import { UploadedScenarioViewComponent } from '../uploaded-scenario-view/uploaded-scenario-view.component';
import { Scenario } from '@types';
import { PlanStateService } from '@services';

@Component({
  selector: 'app-scenario-route-placeholder',
  templateUrl: './scenario-route-placeholder.component.html',
  styleUrl: './scenario-route-placeholder.component.scss',
})
export class ScenarioRoutePlaceholderComponent implements OnInit {
  @ViewChild('container', { read: ViewContainerRef })
  container!: ViewContainerRef;

  constructor(
    private route: ActivatedRoute,
    private planStateService: PlanStateService
  ) {}

  scenario?: Scenario;
  scenarioNotFound = false;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.planStateService.getScenario(id).subscribe({
        next: (scenario: Scenario) => {
          this.scenario = scenario;
          if (this.scenario?.origin === 'USER') {
            const factory = this.container.createComponent(
              UploadedScenarioViewComponent
            );
            factory.instance.scenario = this.scenario;
          } else {
            this.container.createComponent(CreateScenariosComponent);
          }
        },
        error: () => {
          this.scenarioNotFound = true;
        },
      });
    }
  }
}
