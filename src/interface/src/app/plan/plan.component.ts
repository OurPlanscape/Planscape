import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, take } from 'rxjs';

import { Plan } from '../types';
import { PlanService } from './../services/plan.service';

export enum PlanStep {
  Overview,
  CreateScenarios,
  SetPriorities,
}

@Component({
  selector: 'app-plan',
  templateUrl: './plan.component.html',
  styleUrls: ['./plan.component.scss'],
})
export class PlanComponent {
  plan: Plan | undefined;
  currentPlan$ = new BehaviorSubject<Plan | null>(null);
  currentPlanStep: PlanStep = PlanStep.Overview;
  planNotFound: boolean = false;

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

  nextStep(): void {
    this.currentPlanStep += 1;
  }

  previousStep(): void {
    this.currentPlanStep -= 1;
  }
}
