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

import { Plan, User } from '@types';
import { AuthService, PlanStateService } from '@services';
import { Breadcrumb } from '@shared';
import { getPlanPath } from './plan-helpers';

@Component({
  selector: 'app-plan',
  templateUrl: './plan.component.html',
  styleUrls: ['./plan.component.scss'],
})
export class PlanComponent implements OnInit, OnDestroy {
  currentPlan$ = new BehaviorSubject<Plan | null>(null);
  planOwner$ = new Observable<User | null>();

  showOverview$ = new BehaviorSubject<boolean>(false);
  area$ = this.showOverview$.pipe(
    map((show) => (show ? 'SCENARIOS' : 'SCENARIO'))
  );

  scenarioName$ = this.planStateService.planState$.pipe(
    map((state) => {
      return state.currentScenarioName || null;
    })
  );
  breadcrumbs$ = combineLatest([
    this.currentPlan$.pipe(filter((plan): plan is Plan => !!plan)),
    this.scenarioName$,
  ]).pipe(
    map(([plan, scenarioName]) => {
      const path = this.getPathFromSnapshot();
      const scenarioId = this.route.children[0]?.snapshot.params['id'];

      const crumbs: Breadcrumb[] = [
        {
          name: plan.name,
          path: path === 'config' ? getPlanPath(plan.id) : undefined,
        },
      ];

      // If we dont check for scenarioId we will see for a second New Scenario and then the scenario name
      if (path === 'config' && !scenarioId && !scenarioName) {
        crumbs.push({ name: 'New Scenario' });
      }

      if (scenarioName) {
        crumbs.push({ name: scenarioName || '' });
      }

      return crumbs;
    })
  );

  private readonly destroy$ = new Subject<void>();

  planId = this.route.snapshot.paramMap.get('id');
  planNotFound: boolean = !this.planId;

  constructor(
    private authService: AuthService,
    private planStateService: PlanStateService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // TODO: Move everything in the constructor to ngOnInit

    if (this.planId === null) {
      this.planNotFound = true;
      return;
    }
    const plan$ = this.planStateService.getPlan(this.planId).pipe(take(1));

    plan$.subscribe({
      next: (plan) => {
        this.currentPlan$.next(plan);
      },
      error: (error) => {
        this.planNotFound = true;
      },
    });

    this.planOwner$ = plan$.pipe(
      concatMap((plan) => {
        return this.authService.getUser(plan.user);
      })
    );
  }

  ngOnInit() {
    this.planStateService.planState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        const path = this.getPathFromSnapshot();
        if (state.currentScenarioId || path === 'config') {
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
    if (this.planId) {
      this.planStateService.updateStateWithPlan(parseInt(this.planId, 10));
    }

    const routeChild = this.route.snapshot.firstChild;
    const path = routeChild?.url[0].path;
    const id = routeChild?.paramMap.get('id') ?? null;

    if (path === 'config') {
      const name = this.planStateService.planState$.value.currentScenarioName;
      this.planStateService.updateStateWithScenario(id, name);
      this.planStateService.updateStateWithShapes(null);
    } else {
      this.planStateService.updateStateWithScenario(null, null);
      this.planStateService.updateStateWithShapes(null);
    }
  }

  backToOverview() {
    this.router.navigate(['plan', this.currentPlan$.value!.id]);
  }
}
