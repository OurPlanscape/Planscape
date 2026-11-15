import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { HttpEventType } from '@angular/common/http';
import { environment } from '@env/environment';
import { WorkspaceDataLayersService } from './workspace-data-layers.service';

describe('WorkspaceDataLayersService', () => {
  let service: WorkspaceDataLayersService;
  let httpTestingController: HttpTestingController;
  const basePath = `${environment.backend_endpoint}/v2/workspaces/7/datalayers/`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(WorkspaceDataLayersService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('creates an upload in the workspace', () => {
    const body = { name: 'Canopy', original_name: 'canopy.tif', size: 10 };
    service.createUpload(7, body).subscribe();

    const req = httpTestingController.expectOne(basePath);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.withCredentials).toBeTrue();
    req.flush({});
  });

  it('deletes a workspace data layer', () => {
    service.deleteDataLayer(7, 3).subscribe();

    const req = httpTestingController.expectOne(`${basePath}3/`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(null);
  });

  it('PUTs the file without credentials and reports progress', () => {
    const file = new File(['abcd'], 'canopy.tif');
    const progress: number[] = [];
    let completed = false;
    service.uploadFile('https://storage.example/session', file).subscribe({
      next: (value) => progress.push(value),
      complete: () => (completed = true),
    });

    const req = httpTestingController.expectOne(
      'https://storage.example/session'
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toBe(file);
    expect(req.request.withCredentials).toBeFalse();
    expect(req.request.headers.get('Content-Type')).toBe('image/tiff');

    req.event({ type: HttpEventType.UploadProgress, loaded: 1, total: 4 });
    req.event({ type: HttpEventType.UploadProgress, loaded: 4, total: 4 });
    req.flush(null);

    expect(progress).toEqual([0.25, 1, 1]);
    expect(completed).toBeTrue();
  });
});
