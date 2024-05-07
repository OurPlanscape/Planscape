import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  ActivatedRoute,
  Event as NavigationEvent,
  NavigationEnd,
  Router,
} from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  concatMap,
  filter,
  map,
  Observable,
  of,
  Subject,
  switchMap,
  take,
  takeUntil,
} from 'rxjs';

import { Plan, User } from '@types';
import { AuthService, PlanStateService, ScenarioService } from '@services';
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

  scenario$ = this.planStateService.planState$.pipe(
    switchMap((state) => {
      if (state.currentScenarioId) {
        return this.scenarioService.getScenario(state.currentScenarioId);
      }
      return of(null);
    }),
    catchError((e) => {
      return of(undefined);
    })
  );
  breadcrumbs$ = combineLatest([
    this.currentPlan$.pipe(filter((plan): plan is Plan => !!plan)),
    this.scenario$,
  ]).pipe(
    map(([plan, scenario]) => {
      const path = this.getPathFromSnapshot();
      const crumbs: Breadcrumb[] = [
        {
          name: plan.name,
          path: path === 'config' ? getPlanPath(plan.id) : undefined,
        },
      ];
      if (scenario === undefined) {
        return crumbs;
      }
      if (path === 'config' && !scenario) {
        crumbs.push({ name: 'New Scenario' });
      }
      if (scenario) {
        crumbs.push({ name: scenario.name || '' });
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
    private router: Router,
    private scenarioService: ScenarioService
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
    const path = this.getPathFromSnapshot();
    this.planStateService.planState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
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
      this.planStateService.updateStateWithScenario(id);
      this.planStateService.updateStateWithShapes(null);
    } else {
      this.planStateService.updateStateWithScenario(null);
      this.planStateService.updateStateWithShapes(null);
    }
  }

  backToOverview() {
    this.router.navigate(['plan', this.currentPlan$.value!.id]);
  }

  goBack() {
    if (this.showOverview$.value) {
      this.router.navigate(['home']);
    } else {
      this.backToOverview();
    }
  }
}
