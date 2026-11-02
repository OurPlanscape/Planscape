import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import {
  catchError,
  EMPTY,
  exhaustMap,
  filter,
  Observable,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs';
import { AuthService, WebSocketService } from '@services';
import { Plan, PLANNING_AREA_DELETED_EVENT } from '@types';
import { PlanState } from './plan.state';
import { PlanDeletedModalComponent } from './plan-deleted-modal/plan-deleted-modal.component';

/**
 * Tells whoever is looking at a plan when someone else deletes it, and sends
 * them back to where the plan lived.
 */
@Injectable({
  providedIn: 'root',
})
export class PlanDeletedListenerService {
  private webSocketService = inject(WebSocketService);
  private planState = inject(PlanState);
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  start(): void {
    this.webSocketService
      .on(PLANNING_AREA_DELETED_EVENT)
      .pipe(
        filter(
          (event) => event.actor_id !== this.authService.currentUser()?.id
        ),
        withLatestFrom(this.planState.currentPlanId$),
        filter(([event, planId]) => event.object?.id === planId),
        switchMap(() =>
          this.planState.currentPlan$.pipe(
            take(1),
            catchError(() => EMPTY)
          )
        ),
        // one modal at a time
        exhaustMap((plan) => this.showDeletedModal(plan))
      )
      .subscribe();
  }

  private showDeletedModal(plan: Plan): Observable<unknown> {
    return this.dialog
      .open(PlanDeletedModalComponent, {
        data: { planName: plan.name },
        disableClose: true,
      })
      .afterClosed()
      .pipe(
        tap(() =>
          this.router.navigate(
            plan.workspace ? ['/workspace', plan.workspace] : ['/home']
          )
        )
      );
  }
}
