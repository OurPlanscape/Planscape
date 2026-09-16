import {
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { AuthService, WorkspacesService } from '@services';
import { Workspace } from '@types';
import { POLLING_INTERVAL } from '@plan/plan-helpers';
import { WorkspaceState } from './workspace.state';
import { WorkspaceDeletedListenerService } from './workspace-deleted-listener.service';
import { WorkspaceDeletedModalComponent } from './workspace-deleted-modal/workspace-deleted-modal.component';

describe('WorkspaceDeletedListenerService', () => {
  let service: WorkspaceDeletedListenerService;
  let getWorkspace: jasmine.Spy;
  let dialogOpen: jasmine.Spy;
  let navigate: jasmine.Spy;
  let currentUser: jasmine.Spy;
  let routeWorkspaceId: string | null;

  const workspace = {
    id: 7,
    name: 'Wildfire North',
    created_by: 3,
  } as Workspace;

  const notFound = () =>
    throwError(() => new HttpErrorResponse({ status: 404 }));

  /** Mimics a route tree: root → child with the `workspaceId` param. */
  function routerState() {
    return {
      snapshot: {
        root: {
          paramMap: new Map(),
          firstChild: {
            paramMap: new Map(
              routeWorkspaceId ? [['workspaceId', routeWorkspaceId]] : []
            ),
            firstChild: null,
          },
        },
      },
    };
  }

  beforeEach(() => {
    routeWorkspaceId = '7';

    TestBed.configureTestingModule({
      providers: [
        MockProvider(WorkspacesService),
        MockProvider(WorkspaceState, { currentWorkspace$: of(workspace) }),
        MockProvider(AuthService),
        MockProvider(MatDialog),
        {
          provide: Router,
          useValue: {
            get routerState() {
              return routerState();
            },
            navigate: jasmine.createSpy('navigate'),
          },
        },
      ],
    });

    getWorkspace = spyOn(
      TestBed.inject(WorkspacesService),
      'getWorkspace'
    ).and.returnValue(of(workspace));
    navigate = TestBed.inject(Router).navigate as jasmine.Spy;
    currentUser = spyOn(
      TestBed.inject(AuthService),
      'currentUser'
    ).and.returnValue({ id: 1 } as any);
    dialogOpen = spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({
      afterClosed: () => of(true),
    } as any);

    service = TestBed.inject(WorkspaceDeletedListenerService);
  });

  it('polls the workspace we are in every POLLING_INTERVAL', fakeAsync(() => {
    service.start();

    tick(POLLING_INTERVAL - 1);
    expect(getWorkspace).not.toHaveBeenCalled();

    tick(1);
    expect(getWorkspace).toHaveBeenCalledWith(7);

    tick(POLLING_INTERVAL);
    expect(getWorkspace).toHaveBeenCalledTimes(2);
    expect(dialogOpen).not.toHaveBeenCalled();

    discardPeriodicTasks();
  }));

  it('does not poll while outside a workspace', fakeAsync(() => {
    routeWorkspaceId = null;
    service.start();

    tick(POLLING_INTERVAL * 2);

    expect(getWorkspace).not.toHaveBeenCalled();
    discardPeriodicTasks();
  }));

  it('shows the modal and goes home when the workspace is gone', fakeAsync(() => {
    getWorkspace.and.returnValue(notFound());
    service.start();

    tick(POLLING_INTERVAL);

    expect(dialogOpen).toHaveBeenCalledWith(
      WorkspaceDeletedModalComponent,
      jasmine.objectContaining({
        data: { workspaceName: 'Wildfire North' },
        disableClose: true,
      })
    );
    expect(navigate).toHaveBeenCalledWith(['/home']);
    discardPeriodicTasks();
  }));

  it('keeps polling after other errors', fakeAsync(() => {
    getWorkspace.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500 }))
    );
    service.start();

    tick(POLLING_INTERVAL);
    expect(dialogOpen).not.toHaveBeenCalled();

    getWorkspace.and.returnValue(notFound());
    tick(POLLING_INTERVAL);
    expect(dialogOpen).toHaveBeenCalledTimes(1);

    discardPeriodicTasks();
  }));

  it('does not bother the creator', fakeAsync(() => {
    currentUser.and.returnValue({ id: 3 } as any);
    getWorkspace.and.returnValue(notFound());
    service.start();

    tick(POLLING_INTERVAL);

    expect(dialogOpen).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    discardPeriodicTasks();
  }));

  it('opens a single modal while it stays open', fakeAsync(() => {
    const closed$ = new Subject<boolean>();
    dialogOpen.and.returnValue({ afterClosed: () => closed$ } as any);
    getWorkspace.and.returnValue(notFound());
    service.start();

    tick(POLLING_INTERVAL * 3);

    expect(dialogOpen).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();

    closed$.next(true);
    expect(navigate).toHaveBeenCalledWith(['/home']);
    discardPeriodicTasks();
  }));

  it('keeps listening when the workspace failed to load', fakeAsync(() => {
    const workspaceState = TestBed.inject(WorkspaceState);
    workspaceState.currentWorkspace$ = throwError(() => new Error('404'));
    getWorkspace.and.returnValue(notFound());
    service.start();

    tick(POLLING_INTERVAL);
    expect(dialogOpen).not.toHaveBeenCalled();

    workspaceState.currentWorkspace$ = of(workspace);
    tick(POLLING_INTERVAL);
    expect(dialogOpen).toHaveBeenCalledTimes(1);

    discardPeriodicTasks();
  }));
});
