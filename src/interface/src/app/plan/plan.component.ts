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
  of,
  Subject,
  switchMap,
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
  currentPlan$ = new BehaviorSubject<Plan | null>(null);
  planOwner$ = new Observable<User | null>();

  showOverview$ = new BehaviorSubject<boolean>(false);

  scenario$ = this.planService.planState$.pipe(
    switchMap((state) => {
      if (state.currentScenarioId) {
        return this.planService.getScenario(state.currentScenarioId);
      }
      return of(null);
    })
  );
  breadcrumbs$ = combineLatest([
    this.currentPlan$.pipe(filter((plan): plan is Plan => !!plan)),
    this.scenario$,
  ]).pipe(
    map(([plan, scenario]) => {
      const crumbs = [plan.name];
      const path = this.getPathFromSnapshot();
      if (path === 'config' && !scenario) {
        crumbs.push('New Scenario');
      }
      if (scenario) {
        crumbs.push(scenario.name || '');
      }
      return crumbs;
    })
  );

  private readonly destroy$ = new Subject<void>();

  planId = this.route.snapshot.paramMap.get('id');
  planNotFound: boolean = !this.planId;

  constructor(
    private authService: AuthService,
    private planService: PlanService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // TODO: Move everything in the constructor to ngOnInit

    if (this.planId === null) {
      this.planNotFound = true;
      return;
    }
    const plan$ = this.planService.getPlan(this.planId).pipe(take(1));

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
    this.planService.updateStateWithPlan(this.planId);
    const routeChild = this.route.snapshot.firstChild;
    const path = routeChild?.url[0].path;
    const id = routeChild?.paramMap.get('id') ?? null;

    if (path === 'config') {
      this.planService.updateStateWithScenario(id);
      this.planService.updateStateWithShapes(null);
    } else {
      this.planService.updateStateWithConfig(null);
      this.planService.updateStateWithScenario(null);
      this.planService.updateStateWithShapes(null);
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
