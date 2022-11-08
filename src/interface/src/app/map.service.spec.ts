import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MapService } from './map.service';

describe('MapService', () => {
  let service: MapService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MapService]
    });
    service = TestBed.inject(MapService);
  });

  it('can load instance', () => {
    expect(service).toBeTruthy();
  });

  describe('getBoundaryShapes', () => {
    it('makes expected calls', () => {
      const httpTestingController = TestBed.inject(HttpTestingController);
      const mockBoundaryData: GeoJSON.GeoJSON = {
        type: 'FeatureCollection',
        features: [],
      };
      service.getBoundaryShapes().subscribe(res => {
        expect(res).toEqual(mockBoundaryData);
      });
      const req = httpTestingController.expectOne(
        'http://127.0.0.1:8000/boundary/boundary_details/?boundary_name=tcsi_huc12'
      );
      expect(req.request.method).toEqual('GET');
      req.flush(mockBoundaryData);
      httpTestingController.verify();
    });
  });

  describe('getExistingProjects', () => {
    it('makes expected calls', () => {
      const httpTestingController = TestBed.inject(HttpTestingController);
      const mockProjectData: GeoJSON.GeoJSON = {
        type: 'FeatureCollection',
        features: [],
      };
      service.getExistingProjects().subscribe(res => {
        expect(res).toEqual(mockProjectData);
      });
      const req = httpTestingController.expectOne(
        'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/ArcGIS/rest/services/CMDash_v3_view/FeatureServer/2/query?where=1%3D1&outFields=PROJECT_NAME%2CPROJECT_STATUS&f=GEOJSON'
      );
      expect(req.request.method).toEqual('GET');
      req.flush(mockProjectData);
      httpTestingController.verify();
    });
  });
});
