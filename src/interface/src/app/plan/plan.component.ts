import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import {
  ActivatedRoute,
  Event as NavigationEvent,
  NavigationEnd,
  Router,
} from '@angular/router';
import { BehaviorSubject, filter, map, Subject, take, takeUntil } from 'rxjs';

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
export class PlanComponent implements OnInit, OnDestroy {
  @ViewChild(PlanMapComponent) map!: PlanMapComponent;

  readonly PlanStep = PlanStep;
  plan: Plan | undefined;
  currentPlan$ = new BehaviorSubject<Plan | null>(null);
  currentPlanStep: PlanStep = PlanStep.Overview;
  planNotFound: boolean = false;
  viewScenario$ = new BehaviorSubject<boolean>(false);

  openConfigId?: number;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private planService: PlanService,
    private route: ActivatedRoute,
    private router: Router
  ) {
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

  ngOnInit() {
    this.planService.planState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        if (state.currentScenarioId) {
          this.viewScenario$.next(true);
        } else {
          this.viewScenario$.next(false);
        }
      });
    this.getScenarioFromRoute();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEvent) => {
        this.getScenarioFromRoute();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  viewScenario(): void {
    this.viewScenario$.next(true);
  }

  private getScenarioFromRoute() {
    const scenarioId =
      this.route.snapshot.firstChild?.paramMap.get('id') ?? null;
    this.planService.updateStateWithScenario(scenarioId);
  }
}
