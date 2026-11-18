import { TestBed } from '@angular/core/testing';

import { DataLayersService } from './data-layers.service';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { environment } from '@env/environment';
import { DataLayer } from '@types';

describe('DatalayersService', () => {
  let service: DataLayersService;
  let httpMock: HttpTestingController;

  const browsePath = `${environment.backend_endpoint}/v2/datalayers/browse/`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(DataLayersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('the uploaded tab', () => {
    it('browses the uploads of a dataset', () => {
      service.listDataLayers(10, 'map', undefined, 7, 'uploaded').subscribe();

      const req = httpMock.expectOne(
        `${environment.backend_endpoint}/v2/datasets/10/browse/`
      );
      expect(req.request.body).toEqual({
        type: 'RASTER',
        module: 'map',
        workspace_id: 7,
        search_tab: 'uploaded',
      });
      req.flush([]);
    });

    it('searches the uploads grouped by dataset', () => {
      service
        .search({
          term: 'fire',
          limit: 20,
          workspaceId: 7,
          searchTab: 'uploaded',
          groupBy: 'dataset',
        })
        .subscribe();

      const req = httpMock.expectOne(
        (r) =>
          r.url ===
          `${environment.backend_endpoint}/v2/datalayers/find_anything/`
      );
      expect(req.request.body).toEqual({
        term: 'fire',
        type: 'RASTER',
        workspace_id: 7,
        search_tab: 'uploaded',
        group_by: 'dataset',
      });
      req.flush({ count: 0, results: [] });
    });
  });

  describe('browseFavorites', () => {
    it('asks for the favorites of the workspace', () => {
      let result: DataLayer[] | undefined;
      const layers = [{ id: 5, name: 'Fuels' }] as DataLayer[];

      service.browseFavorites(7, 'map').subscribe((data) => (result = data));

      const req = httpMock.expectOne(browsePath);

      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        search_tab: 'favorites',
        workspace_id: 7,
        type: 'RASTER',
        module: 'map',
      });
      req.flush(layers);

      expect(result).toEqual(layers);
    });

    it('leaves out the filters it was not given', () => {
      service.browseFavorites(7).subscribe();

      const req = httpMock.expectOne(browsePath);

      expect(req.request.body).toEqual({
        search_tab: 'favorites',
        workspace_id: 7,
        type: 'RASTER',
      });
      req.flush([]);
    });
  });
});
