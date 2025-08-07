import { Component } from '@angular/core';
import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { AsyncPipe, NgIf } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PlanState } from '../../plan/plan.state';
import { PlanModule } from '../../plan/plan.module';

@Component({
  selector: 'app-view-scenario',
  standalone: true,
  imports: [
    DataLayersComponent,
    FormsModule,
    MatTabsModule,
    NgIf,
    AsyncPipe,
    PlanModule,
  ],
  templateUrl: './view-scenario.component.html',
  styleUrl: './view-scenario.component.scss',
})
export class ViewScenarioComponent {
  planId = this.route.snapshot.data['planId'];
  scenarioId = this.route.snapshot.data['scenarioId'];

  plan$ = this.planState.currentPlan$;

  constructor(
    private route: ActivatedRoute,
    private planState: PlanState
  ) {}

  protected readonly undefined = undefined;
}
