import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { WorkspacesService } from './workspaces.service';
import { Workspace } from '@types';

describe('WorkspacesService', () => {
  let service: WorkspacesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WorkspacesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('creates a workspace with the given name', fakeAsync(() => {
    let workspace: Workspace | undefined;

    service
      .createWorkspace({ name: 'My workspace' })
      .subscribe((w) => (workspace = w));
    tick(1000);

    expect(workspace?.name).toBe('My workspace');
    expect(workspace?.id).toEqual(jasmine.any(Number));
  }));
});
