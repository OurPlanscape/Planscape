import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { AuthService, WebSocketService } from '@services';
import { Plan, PLANNING_AREA_DELETED_EVENT, WorkspaceEvent } from '@types';
import { PlanDeletedListenerService } from './plan-deleted-listener.service';
import { PlanDeletedModalComponent } from './plan-deleted-modal/plan-deleted-modal.component';
import { PlanState } from './plan.state';

describe('PlanDeletedListenerService', () => {
  let events$: Subject<WorkspaceEvent>;
  let open: jasmine.Spy;
  let navigate: jasmine.Spy;
  let closed$: Subject<boolean>;
  let plan: Partial<Plan>;

  const deleted = (id: number, actor = 8): WorkspaceEvent => ({
    type: PLANNING_AREA_DELETED_EVENT,
    object: { kind: 'planning_area', id },
    actor_id: actor,
  });

  beforeEach(() => {
    events$ = new Subject();
    closed$ = new Subject();
    plan = { id: 3, name: 'Tahoe', workspace: 5 };
    open = jasmine
      .createSpy('open')
      .and.returnValue({ afterClosed: () => closed$ });
    navigate = jasmine.createSpy('navigate');

    TestBed.configureTestingModule({
      providers: [
        MockProvider(WebSocketService, { on: (() => events$) as any }),
        MockProvider(AuthService, { currentUser: () => ({ id: 7 }) as any }),
        MockProvider(MatDialog, { open }),
        MockProvider(Router, { navigate }),
        {
          provide: PlanState,
          useFactory: () => ({
            currentPlanId$: new BehaviorSubject(3),
            currentPlan$: of(plan),
          }),
        },
      ],
    });

    TestBed.inject(PlanDeletedListenerService).start();
  });

  it('tells whoever is on the plan and sends them to the workspace', () => {
    events$.next(deleted(3));

    expect(open).toHaveBeenCalledWith(PlanDeletedModalComponent, {
      data: { planName: 'Tahoe' },
      disableClose: true,
    });

    closed$.next(true);

    expect(navigate).toHaveBeenCalledWith(['/workspace', 5]);
  });

  it('goes home for a plan without a workspace', () => {
    plan.workspace = null;
    events$.next(deleted(3));

    closed$.next(true);

    expect(navigate).toHaveBeenCalledWith(['/home']);
  });

  it('ignores other plans', () => {
    events$.next(deleted(4));

    expect(open).not.toHaveBeenCalled();
  });

  it('ignores my own deletes', () => {
    events$.next(deleted(3, 7));

    expect(open).not.toHaveBeenCalled();
  });

  it('shows one modal at a time', () => {
    events$.next(deleted(3));
    events$.next(deleted(3));

    expect(open).toHaveBeenCalledTimes(1);
  });
});
