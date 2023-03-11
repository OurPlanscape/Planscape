import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  ActivatedRoute,
  Event as NavigationEvent,
  NavigationEnd,
  Router,
} from '@angular/router';
import { BehaviorSubject, filter, Subject, take, takeUntil } from 'rxjs';

import { Plan } from '../types';
import { PlanService } from './../services/plan.service';

@Component({
  selector: 'app-plan',
  templateUrl: './plan.component.html',
  styleUrls: ['./plan.component.scss'],
})
export class PlanComponent implements OnInit, OnDestroy {
  plan: Plan | undefined;
  currentPlan$ = new BehaviorSubject<Plan | null>(null);
  planNotFound: boolean = false;
  showOverview$ = new BehaviorSubject<boolean>(false);

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
        if (state.currentScenarioId || state.currentConfigId) {
          this.showOverview$.next(false);
        } else {
          this.showOverview$.next(true);
        }
      });
    this.updatePlanStateFromRoute();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEvent) => {
        this.updatePlanStateFromRoute();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updatePlanStateFromRoute() {
    const planId = this.route.snapshot.paramMap.get('id');
    this.planService.updateStateWithPlan(planId);
    const routeChild = this.route.snapshot.firstChild;
    const path = routeChild?.url[0].path;
    const id = routeChild?.paramMap.get('id') ?? null;

    if (path === 'scenario') {
      this.planService.updateStateWithScenario(id);
    } else if (path === 'config') {
      this.planService.updateStateWithConfig(Number(id));
      this.planService.updateStateWithShapes(null);
    } else {
      this.planService.updateStateWithConfig(null);
      this.planService.updateStateWithScenario(null);
      this.planService.updateStateWithShapes(null);
    }
  }

  backToOverview() {
    this.router.navigate(['plan', this.plan!.id]);
  }
}
