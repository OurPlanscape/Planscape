import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { MockProvider } from 'ng-mocks';

import { WorkspacesComponent } from '@app/workspaces/workspaces.component';
import { WorkspaceActionsService } from '@app/workspaces/workspace-actions.service';
import { ListWorkspacesOptions, WorkspacesService } from '@services';
import { Workspace } from '@types';

describe('WorkspacesComponent', () => {
  let fixture: ComponentFixture<WorkspacesComponent>;
  let actionsService: WorkspaceActionsService;
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

  function setup(
    listResult = of({ count: 1, results: [workspace] }),
    searchResult = listResult
  ) {
    workspacesService = TestBed.inject(WorkspacesService);
    spyOn(workspacesService, 'listWorkspaces').and.callFake(
      (options: ListWorkspacesOptions = {}) =>
        (options.search ? searchResult : listResult) as any
    );

    actionsService = TestBed.inject(WorkspaceActionsService);
    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(WorkspacesComponent);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspacesComponent, NoopAnimationsModule],
      providers: [
        MockProvider(WorkspaceActionsService),
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

    it('creates from the header without the welcome flow', () => {
      const spy = spyOn(
        actionsService,
        'openCreateWorkspaceModal'
      ).and.returnValue(of(null));

      fixture.nativeElement
        .querySelector('.workspaces-header button[sg-button]')
        .click();

      expect(spy).toHaveBeenCalledWith('list');
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
        actionsService,
        'openCreateWorkspaceModal'
      ).and.returnValue(of(null));

      fixture.nativeElement.querySelector('button[sg-button]').click();

      expect(spy).toHaveBeenCalledWith('empty-state');
    });

    it('reloads the list after a workspace is created', () => {
      spyOn(actionsService, 'openCreateWorkspaceModal').and.returnValue(
        of(workspace)
      );

      fixture.componentInstance.createWorkspace('list');

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

  describe('search', () => {
    const noResults = of({ count: 0, results: [] });

    function search(term: string) {
      fixture.componentInstance.search(term);
      fixture.detectChanges();
    }

    it('requests the filtered list', () => {
      setup();

      search('wild');

      expect(workspacesService.listWorkspaces).toHaveBeenCalledWith(
        jasmine.objectContaining({ search: 'wild' })
      );
    });

    it('shows a no results state when nothing matches', () => {
      setup(of({ count: 1, results: [workspace] }), noResults);

      search('nope');

      expect(fixture.nativeElement.textContent).toContain(
        'No Results for "nope"'
      );
      expect(fixture.nativeElement.textContent).not.toContain(
        'Workspace: A shared space for smarter planning'
      );
    });

    it('keeps the search bar around so the term can be changed', () => {
      setup(of({ count: 1, results: [workspace] }), noResults);

      search('nope');

      expect(fixture.nativeElement.querySelector('sg-search-bar')).toBeTruthy();
    });

    it('shows the create empty state when there is nothing to search', () => {
      setup(noResults);

      expect(fixture.nativeElement.querySelector('sg-no-results')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain(
        'Workspace: A shared space for smarter planning'
      );
    });
  });

  describe('pagination', () => {
    it('is hidden when everything fits on one page', () => {
      setup();

      expect(fixture.nativeElement.querySelector('sg-paginator')).toBeNull();
    });

    it('shows a compact paginator once there is more than one page', () => {
      setup(of({ count: 30, results: [workspace] }));

      const paginator = fixture.nativeElement.querySelector('sg-paginator');

      expect(paginator).toBeTruthy();
      expect(paginator.querySelector('.per-page-picker')).toBeNull();
    });

    it('requests the matching offset when the page changes', () => {
      setup(of({ count: 30, results: [workspace] }));

      fixture.componentInstance.goToPage(3);

      expect(workspacesService.listWorkspaces).toHaveBeenCalledWith(
        jasmine.objectContaining({ limit: 12, offset: 24 })
      );
    });

    it('stays put while the next page loads', () => {
      setup(of({ count: 30, results: [workspace] }));
      (workspacesService.listWorkspaces as jasmine.Spy).and.returnValue(
        new Subject<any>()
      );

      fixture.componentInstance.goToPage(2);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('sg-paginator')).toBeTruthy();
    });

    it('goes back to the first page on a new search', () => {
      setup(of({ count: 30, results: [workspace] }));
      fixture.componentInstance.goToPage(3);

      fixture.componentInstance.search('wild');

      expect(workspacesService.listWorkspaces).toHaveBeenCalledWith(
        jasmine.objectContaining({ search: 'wild', offset: 0 })
      );
    });
  });

  describe('card actions', () => {
    it('reloads the list after a rename', () => {
      setup();
      spyOn(actionsService, 'renameWorkspace').and.returnValue(of(workspace));

      fixture.componentInstance.renameWorkspace(workspace);

      expect(workspacesService.listWorkspaces).toHaveBeenCalledTimes(2);
    });

    it('leaves the list alone when a rename is cancelled', () => {
      setup();
      spyOn(actionsService, 'renameWorkspace').and.returnValue(of(null));

      fixture.componentInstance.renameWorkspace(workspace);

      expect(workspacesService.listWorkspaces).toHaveBeenCalledTimes(1);
    });

    it('reloads the list after a delete', () => {
      setup();
      spyOn(actionsService, 'deleteWorkspace').and.returnValue(of(true));

      fixture.componentInstance.deleteWorkspace(workspace);

      expect(workspacesService.listWorkspaces).toHaveBeenCalledTimes(2);
    });

    it('leaves the list alone when a delete is cancelled', () => {
      setup();
      spyOn(actionsService, 'deleteWorkspace').and.returnValue(of(false));

      fixture.componentInstance.deleteWorkspace(workspace);

      expect(workspacesService.listWorkspaces).toHaveBeenCalledTimes(1);
    });

    it('steps back a page when the last card on it is deleted', () => {
      setup(of({ count: 13, results: [workspace] }));
      fixture.componentInstance.goToPage(2);
      spyOn(actionsService, 'deleteWorkspace').and.returnValue(of(true));

      fixture.componentInstance.deleteWorkspace(workspace);

      const spy = workspacesService.listWorkspaces as jasmine.Spy;
      expect(spy.calls.mostRecent().args[0]).toEqual(
        jasmine.objectContaining({ offset: 0 })
      );
    });
  });

  describe('while a request is in flight', () => {
    it('shows the header and a spinner, not the create empty state', () => {
      setup(new Subject<any>());

      expect(
        fixture.nativeElement.querySelector('.workspaces-header')
      ).toBeTruthy();
      expect(fixture.nativeElement.querySelector('mat-spinner')).toBeTruthy();
      expect(fixture.nativeElement.textContent).not.toContain(
        'Workspace: A shared space for smarter planning'
      );
    });

    it('keeps the shell while a cleared search reloads', () => {
      const cleared = new Subject<any>();
      setup(cleared, of({ count: 0, results: [] }));
      cleared.next({ count: 1, results: [workspace] });
      fixture.detectChanges();

      fixture.componentInstance.search('nope');
      fixture.detectChanges();
      fixture.componentInstance.search('');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain(
        'Workspace: A shared space for smarter planning'
      );
      expect(fixture.nativeElement.querySelector('mat-spinner')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('sg-search-bar')).toBeTruthy();
    });
  });
});
