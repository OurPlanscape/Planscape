import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Workspace } from '@types';
import { WorkspacesService } from './workspaces.service';

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  let httpTestingController: HttpTestingController;

  const workspace: Workspace = {
    id: 1,
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

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [WorkspacesService],
    });
    service = TestBed.inject(WorkspacesService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listWorkspaces', () => {
    it('requests the workspace list', () => {
      let result: Workspace[] | undefined;
      service.listWorkspaces().subscribe((page) => (result = page.results));

      const req = httpTestingController.expectOne(service.v2Path);
      expect(req.request.method).toEqual('GET');
      req.flush({ count: 1, results: [workspace] });

      expect(result).toEqual([workspace]);
    });

    it('passes the search term', () => {
      service.listWorkspaces({ search: 'wild' }).subscribe();

      const req = httpTestingController.expectOne(
        `${service.v2Path}?search=wild`
      );
      expect(req.request.params.get('search')).toBe('wild');
      req.flush({ count: 0, results: [] });
    });

    it('passes limit and offset', () => {
      service.listWorkspaces({ limit: 12, offset: 24 }).subscribe();

      const req = httpTestingController.expectOne(
        `${service.v2Path}?limit=12&offset=24`
      );
      req.flush({ count: 0, results: [] });
    });

    it('omits empty params', () => {
      service.listWorkspaces({ search: '', offset: 0 }).subscribe();

      const req = httpTestingController.expectOne(service.v2Path);
      expect(req.request.params.has('search')).toBeFalse();
      expect(req.request.params.has('offset')).toBeFalse();
      req.flush({ count: 0, results: [] });
    });
  });

  describe('getWorkspace', () => {
    it('requests a single workspace', () => {
      service.getWorkspace(1).subscribe();

      const req = httpTestingController.expectOne(service.v2Path + '1/');
      expect(req.request.method).toEqual('GET');
      req.flush(workspace);
    });

    it('propagates a 404 as an http error', () => {
      let status: number | undefined;
      service.getWorkspace(404).subscribe({
        error: (error) => (status = error.status),
      });

      httpTestingController
        .expectOne(service.v2Path + '404/')
        .flush(
          { detail: 'Not found.' },
          { status: 404, statusText: 'Not Found' }
        );

      expect(status).toBe(404);
    });
  });

  describe('createWorkspace', () => {
    it('posts the name', () => {
      let result: Workspace | undefined;
      service
        .createWorkspace({ name: 'My workspace' })
        .subscribe((w) => (result = w));

      const req = httpTestingController.expectOne(service.v2Path);
      expect(req.request.method).toEqual('POST');
      expect(req.request.body).toEqual({ name: 'My workspace' });
      req.flush(workspace);

      expect(result).toEqual(workspace);
    });
  });

  describe('updateWorkspace', () => {
    it('patches the name', () => {
      service.updateWorkspace(1, { name: 'Renamed' }).subscribe();

      const req = httpTestingController.expectOne(service.v2Path + '1/');
      expect(req.request.method).toEqual('PATCH');
      expect(req.request.body).toEqual({ name: 'Renamed' });
      req.flush(workspace);
    });
  });

  describe('deleteWorkspace', () => {
    it('deletes the workspace', () => {
      service.deleteWorkspace(1).subscribe();

      const req = httpTestingController.expectOne(service.v2Path + '1/');
      expect(req.request.method).toEqual('DELETE');
      req.flush(null);
    });
  });
});
