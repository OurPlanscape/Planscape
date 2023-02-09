import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, take } from 'rxjs';

import { Plan } from '../types';
import { PlanService } from './../services/plan.service';
import { PlanMapComponent } from './plan-map/plan-map.component';

export enum PlanStep {
  Overview,
  CreateScenarios,
}

@Component({
  selector: 'app-plan',
  templateUrl: './plan.component.html',
  styleUrls: ['./plan.component.scss'],
})
export class PlanComponent {
  @ViewChild(PlanMapComponent) map!: PlanMapComponent;

  readonly PlanStep = PlanStep;
  plan: Plan | undefined;
  currentPlan$ = new BehaviorSubject<Plan | null>(null);
  currentPlanStep: PlanStep = PlanStep.Overview;
  planNotFound: boolean = false;

  openConfigId?: number;

  constructor(private planService: PlanService, private route: ActivatedRoute) {
    const planId = this.route.snapshot.paramMap.get('id');

    if (planId === null) {
      this.planNotFound = true;
      return;
    }

    this.planService
      .getPlan(planId)
      .pipe(take(1))
      .subscribe(
        (plan) => {
          this.plan = plan;
          this.currentPlan$.next(this.plan);
        },
        (error) => {
          this.planNotFound = true;
        }
      );
  }

  changeCondition(filepath: string): void {
    this.map.setCondition(filepath);
  }

  drawShapes(shapes: any): void {
    this.map.drawShapes(shapes);
  }

  openConfig(configId: number): void {
    this.openConfigId = configId;
    this.currentPlanStep = PlanStep.CreateScenarios;
  }
}
