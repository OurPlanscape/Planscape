import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { WorkspacesService } from '@services';
import { Workspace } from '@types';
import { DeleteDialogComponent } from '@standalone/delete-dialog/delete-dialog.component';
import { WorkspaceActionsService } from './workspace-actions.service';
import { CreateWorkspaceModalComponent } from './create-workspace-modal/create-workspace-modal.component';
import { WelcomeWorkspaceModalComponent } from './welcome-workspace-modal/welcome-workspace-modal.component';

describe('WorkspaceActionsService', () => {
  let service: WorkspaceActionsService;
  let dialog: jasmine.SpyObj<MatDialog>;
  let router: jasmine.SpyObj<Router>;
  let snackbar: jasmine.SpyObj<MatSnackBar>;
  let workspacesService: jasmine.SpyObj<WorkspacesService>;

  const workspace: Workspace = {
    id: 5,
    name: 'My workspace',
    creator: 'Han Solo',
    created_by: 3,
    created_at: '2026-08-21T00:00:00Z',
    updated_at: '2026-08-21T00:00:00Z',
    planning_areas_count: 0,
    collaborators_count: 1,
    role: 'OWNER',
    permissions: ['view_workspace'],
  };

  function setUp(closedWith: Workspace | boolean | undefined) {
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    dialog.open.and.returnValue({
      afterClosed: () => of(closedWith),
    } as any);
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
    snackbar = jasmine.createSpyObj('MatSnackBar', ['open']);
    workspacesService = jasmine.createSpyObj('WorkspacesService', [
      'deleteWorkspace',
    ]);
    workspacesService.deleteWorkspace.and.returnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        WorkspaceActionsService,
        { provide: MatDialog, useValue: dialog },
        { provide: Router, useValue: router },
        { provide: MatSnackBar, useValue: snackbar },
        { provide: WorkspacesService, useValue: workspacesService },
      ],
    });
    service = TestBed.inject(WorkspaceActionsService);
  }

  it('opens the create workspace modal', () => {
    setUp(workspace);

    service.openCreateWorkspaceModal('list').subscribe();

    expect(dialog.open.calls.first().args[0]).toBe(
      CreateWorkspaceModalComponent
    );
  });

  describe('from the empty state', () => {
    it('navigates to the new workspace and welcomes the user', async () => {
      setUp(workspace);

      service.openCreateWorkspaceModal('empty-state').subscribe();
      await router.navigate.calls.mostRecent().returnValue;

      expect(router.navigate).toHaveBeenCalledWith(['/workspace', 5]);
      expect(dialog.open.calls.mostRecent().args[0]).toBe(
        WelcomeWorkspaceModalComponent
      );
      expect(snackbar.open).not.toHaveBeenCalled();
    });
  });

  describe('from the list', () => {
    it('shows a toast and does not redirect', () => {
      setUp(workspace);

      service.openCreateWorkspaceModal('list').subscribe();

      expect(snackbar.open).toHaveBeenCalledWith(
        'Workspace "My workspace" has been created',
        'Dismiss',
        SNACK_NOTICE_CONFIG
      );
      expect(SNACK_NOTICE_CONFIG.duration).toBe(4000);
      expect(router.navigate).not.toHaveBeenCalled();
      expect(dialog.open).toHaveBeenCalledTimes(1);
    });

    it('emits the created workspace so the caller can refresh', () => {
      setUp(workspace);
      const emitted: (Workspace | null)[] = [];

      service
        .openCreateWorkspaceModal('list')
        .subscribe((w) => emitted.push(w));

      expect(emitted).toEqual([workspace]);
    });
  });

  describe('when cancelled', () => {
    it('emits null and does nothing else', () => {
      setUp(undefined);
      const emitted: (Workspace | null)[] = [];

      service
        .openCreateWorkspaceModal('list')
        .subscribe((w) => emitted.push(w));

      expect(emitted).toEqual([null]);
      expect(snackbar.open).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });
  describe('renaming', () => {
    it('opens the workspace modal prefilled with the workspace', () => {
      setUp(workspace);

      service.renameWorkspace(workspace).subscribe();

      expect(dialog.open.calls.first().args[0]).toBe(
        CreateWorkspaceModalComponent
      );
      expect(dialog.open.calls.first().args[1]?.data).toEqual({ workspace });
    });

    it('emits the renamed workspace and toasts', () => {
      setUp(workspace);
      const emitted: (Workspace | null)[] = [];

      service.renameWorkspace(workspace).subscribe((w) => emitted.push(w));

      expect(emitted).toEqual([workspace]);
      expect(snackbar.open).toHaveBeenCalledWith(
        'Workspace name has been updated',
        'Dismiss',
        SNACK_NOTICE_CONFIG
      );
    });

    it('emits null and stays quiet when cancelled', () => {
      setUp(undefined);
      const emitted: (Workspace | null)[] = [];

      service.renameWorkspace(workspace).subscribe((w) => emitted.push(w));

      expect(emitted).toEqual([null]);
      expect(snackbar.open).not.toHaveBeenCalled();
    });
  });

  describe('deleting', () => {
    it('asks for confirmation first', () => {
      setUp(undefined);

      service.deleteWorkspace(workspace).subscribe();

      expect(dialog.open.calls.first().args[0]).toBe(DeleteDialogComponent);
      expect(workspacesService.deleteWorkspace).not.toHaveBeenCalled();
    });

    it('does nothing when the user backs out', () => {
      setUp(undefined);
      const emitted: boolean[] = [];

      service.deleteWorkspace(workspace).subscribe((d) => emitted.push(d));

      expect(emitted).toEqual([false]);
      expect(snackbar.open).not.toHaveBeenCalled();
    });

    it('deletes and toasts once confirmed', () => {
      setUp(true);
      const emitted: boolean[] = [];

      service.deleteWorkspace(workspace).subscribe((d) => emitted.push(d));

      expect(workspacesService.deleteWorkspace).toHaveBeenCalledWith(5);
      expect(emitted).toEqual([true]);
      expect(snackbar.open).toHaveBeenCalledWith(
        'Successfully deleted workspace: My workspace',
        'Dismiss',
        SNACK_NOTICE_CONFIG
      );
    });

    it('reports a failed delete without emitting success', () => {
      setUp(true);
      workspacesService.deleteWorkspace.and.returnValue(
        throwError(() => new Error('nope'))
      );
      const emitted: boolean[] = [];

      service.deleteWorkspace(workspace).subscribe((d) => emitted.push(d));

      expect(emitted).toEqual([false]);
      expect(snackbar.open).toHaveBeenCalledWith(
        'Unable to delete workspace: My workspace',
        'Dismiss',
        SNACK_ERROR_CONFIG
      );
    });
  });
});
