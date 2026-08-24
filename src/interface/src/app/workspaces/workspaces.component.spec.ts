import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MockProvider } from 'ng-mocks';

import { WorkspacesComponent } from '@app/workspaces/workspaces.component';
import { WorkspaceCreationService } from '@app/workspaces/workspace-creation.service';
import { WorkspacesService } from '@services';
import { Workspace } from '@types';

describe('WorkspacesComponent', () => {
  let fixture: ComponentFixture<WorkspacesComponent>;
  let creationService: WorkspaceCreationService;
  let workspacesService: WorkspacesService;
  let router: Router;

  const workspace: Workspace = {
    id: 7,
    name: 'Wildfire North',
    creator: 'Han Solo',
    created_by: 3,
    created_at: '2026-08-21T00:00:00Z',
    updated_at: '2026-08-21T00:00:00Z',
    planning_areas_count: 4,
    collaborators_count: 2,
    role: 'OWNER',
    permissions: ['view_workspace', 'change_workspace', 'remove_workspace'],
  };

  function setup(listResult = of({ count: 1, results: [workspace] })) {
    workspacesService = TestBed.inject(WorkspacesService);
    spyOn(workspacesService, 'listWorkspaces').and.returnValue(
      listResult as any
    );

    creationService = TestBed.inject(WorkspaceCreationService);
    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(WorkspacesComponent);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspacesComponent],
      providers: [
        MockProvider(WorkspaceCreationService),
        MockProvider(WorkspacesService),
        MockProvider(Router),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('when the user has workspaces', () => {
    beforeEach(() => setup());

    it('renders a card per workspace', () => {
      const cards = fixture.nativeElement.querySelectorAll('sg-workspace-card');

      expect(cards.length).toBe(1);
      expect(fixture.nativeElement.textContent).toContain('Wildfire North');
    });

    it('does not show the empty state', () => {
      expect(fixture.nativeElement.textContent).not.toContain(
        'Workspace: A shared space for smarter planning'
      );
    });

    it('navigates to the workspace when a card is clicked', () => {
      const spy = spyOn(router, 'navigate');

      fixture.nativeElement.querySelector('sg-workspace-card').click();

      expect(spy).toHaveBeenCalledWith(['/workspace', 7]);
    });
  });

  describe('when the user has no workspaces', () => {
    beforeEach(() => setup(of({ count: 0, results: [] })));

    it('shows the empty state with a create workspace action', () => {
      expect(fixture.nativeElement.textContent).toContain(
        'Workspace: A shared space for smarter planning'
      );
    });

    it('starts the create flow from the empty state', () => {
      const spy = spyOn(
        creationService,
        'openCreateWorkspaceModal'
      ).and.returnValue(of(null));

      fixture.nativeElement.querySelector('button[sg-button]').click();

      expect(spy).toHaveBeenCalledWith('empty-state');
    });

    it('reloads the list after a workspace is created', () => {
      spyOn(creationService, 'openCreateWorkspaceModal').and.returnValue(
        of(workspace)
      );

      fixture.componentInstance.createWorkspace();

      expect(workspacesService.listWorkspaces).toHaveBeenCalledTimes(2);
    });
  });

  describe('when loading fails', () => {
    beforeEach(() => setup(throwError(() => new Error('nope'))));

    it('shows an error state instead of the empty state', () => {
      expect(fixture.nativeElement.textContent).toContain(
        "We couldn't load your workspaces"
      );
      expect(fixture.nativeElement.textContent).not.toContain(
        'Workspace: A shared space for smarter planning'
      );
    });

    it('retries on demand', () => {
      fixture.componentInstance.retry();

      expect(workspacesService.listWorkspaces).toHaveBeenCalledTimes(2);
    });
  });
});
