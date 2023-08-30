import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  ActivatedRoute,
  Event as NavigationEvent,
  NavigationEnd,
  Router,
} from '@angular/router';
import {
  BehaviorSubject,
  combineLatest,
  concatMap,
  filter,
  map,
  Observable,
  Subject,
  take,
  takeUntil,
} from 'rxjs';

import { Plan, User } from '../types';
import { AuthService, PlanService } from '../services';

@Component({
  selector: 'app-plan',
  templateUrl: './plan.component.html',
  styleUrls: ['./plan.component.scss'],
})
export class PlanComponent implements OnInit, OnDestroy {
  plan: Plan | undefined;
  currentPlan$ = new BehaviorSubject<Plan | null>(null);
  planOwner$ = new Observable<User | null>();
  planNotFound: boolean = false;
  showOverview$ = new BehaviorSubject<boolean>(false);
  // TODO this should show the scenario name if looking for configuration/scenario.
  // for now displaying scenario id
  breadcrumbs$ = combineLatest([
    this.currentPlan$,
    this.planService.planState$,
  ]).pipe(
    map(([plan, planState]) => {
      const crumbs = plan ? [plan.name] : [];
      if (planState.currentConfigId) {
        crumbs.push(planState.currentConfigId + '');
      }
      return crumbs;
    })
  );

  breadcrumbs$ = this.currentPlan$.pipe(
    map((plan) => {
      const crumbs = plan ? [plan.name] : [];
      const path = this.getPathFromSnapshot();
      if (path === 'config') {
        crumbs.push('New Configuration');
      }
      return crumbs;
    })
  );

  openConfigId?: number;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private planService: PlanService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // TODO: Move everything in the constructor to ngOnInit
    const planId = this.route.snapshot.paramMap.get('id');

    if (planId === null) {
      this.planNotFound = true;
      return;
    }

    const plan$ = this.planService.getPlan(planId).pipe(take(1));

    plan$.subscribe({
      next: (plan) => {
        this.plan = plan;
        this.currentPlan$.next(this.plan);
      },
      error: (error) => {
        this.planNotFound = true;
      },
    });

    this.planOwner$ = plan$.pipe(
      concatMap((plan) => {
        return this.authService.getUser(plan.ownerId);
      })
    );
  }

  ngOnInit() {
    const path = this.getPathFromSnapshot();
    this.planService.planState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        if (
          state.currentScenarioId ||
          state.currentConfigId ||
          path === 'config'
        ) {
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

  private getPathFromSnapshot() {
    const routeChild = this.route.snapshot.firstChild;
    return routeChild?.url[0].path;
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

  goBack() {
    if (this.showOverview$.value) {
      this.router.navigate(['home']);
    } else {
      this.backToOverview();
    }
  }
}
