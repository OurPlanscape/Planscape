import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { filter, of, Subject, throwError } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { AuthService, WebSocketService } from '@services';
import { Workspace, WorkspaceEvent, WORKSPACE_DELETED_EVENT } from '@types';
import { WorkspaceState } from './workspace.state';
import { WorkspaceDeletedListenerService } from './workspace-deleted-listener.service';
import { WorkspaceDeletedModalComponent } from './workspace-deleted-modal/workspace-deleted-modal.component';

describe('WorkspaceDeletedListenerService', () => {
  let service: WorkspaceDeletedListenerService;
  let events$: Subject<WorkspaceEvent>;
  let dialogOpen: jasmine.Spy;
  let navigate: jasmine.Spy;
  let currentUser: jasmine.Spy;
  let currentWorkspaceId: number | null;

  const workspace = {
    id: 7,
    name: 'Wildfire North',
    created_by: 3,
  } as Workspace;

  /** What the backend sends to everyone connected to the workspace. */
  const deleted = (actorId: number | null = 3, workspaceId = 7) =>
    ({
      type: WORKSPACE_DELETED_EVENT,
      workspace_id: workspaceId,
      object: { kind: 'workspace', id: workspaceId },
      data: { workspace_id: workspaceId },
      actor_id: actorId,
    }) as WorkspaceEvent;

  beforeEach(() => {
    events$ = new Subject<WorkspaceEvent>();
    currentWorkspaceId = 7;

    TestBed.configureTestingModule({
      providers: [
        MockProvider(AuthService),
        MockProvider(MatDialog),
        {
          provide: WebSocketService,
          useValue: {
            on: (type: string) =>
              events$.pipe(filter((event) => event.type === type)),
          },
        },
        {
          provide: WorkspaceState,
          useValue: {
            currentWorkspace$: of(workspace),
            get currentWorkspaceIdValue() {
              return currentWorkspaceId;
            },
          },
        },
        {
          provide: Router,
          useValue: { navigate: jasmine.createSpy('navigate') },
        },
      ],
    });

    navigate = TestBed.inject(Router).navigate as jasmine.Spy;
    currentUser = spyOn(
      TestBed.inject(AuthService),
      'currentUser'
    ).and.returnValue({ id: 1 } as any);
    dialogOpen = spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({
      afterClosed: () => of(true),
    } as any);

    service = TestBed.inject(WorkspaceDeletedListenerService);
    service.start();
  });

  it('shows the modal and goes home when the workspace is deleted', () => {
    events$.next(deleted());

    expect(dialogOpen).toHaveBeenCalledWith(
      WorkspaceDeletedModalComponent,
      jasmine.objectContaining({
        data: { workspaceName: 'Wildfire North' },
        disableClose: true,
      })
    );
    expect(navigate).toHaveBeenCalledWith(['/home']);
  });

  it('does not bother whoever deleted it', () => {
    currentUser.and.returnValue({ id: 3 } as any);

    events$.next(deleted(3));

    expect(dialogOpen).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('ignores an event about another workspace', () => {
    events$.next(deleted(3, 9));

    expect(dialogOpen).not.toHaveBeenCalled();
  });

  it('ignores the other events of the workspace', () => {
    events$.next({
      type: 'planning.planning_area.created',
      workspace_id: 7,
    });

    expect(dialogOpen).not.toHaveBeenCalled();
  });

  it('opens a single modal while it stays open', () => {
    const closed$ = new Subject<boolean>();
    dialogOpen.and.returnValue({ afterClosed: () => closed$ } as any);

    events$.next(deleted());
    events$.next(deleted());

    expect(dialogOpen).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();

    closed$.next(true);

    expect(navigate).toHaveBeenCalledWith(['/home']);
  });

  it('keeps listening when the workspace failed to load', () => {
    const workspaceState = TestBed.inject(WorkspaceState);
    (workspaceState as any).currentWorkspace$ = throwError(
      () => new Error('404')
    );

    events$.next(deleted());
    expect(dialogOpen).not.toHaveBeenCalled();

    (workspaceState as any).currentWorkspace$ = of(workspace);
    events$.next(deleted());

    expect(dialogOpen).toHaveBeenCalledTimes(1);
  });
});
