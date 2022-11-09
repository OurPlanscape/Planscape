import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MapService } from './map.service';
import { Region } from './types';

describe('MapService', () => {
  let service: MapService;
  let fakeGeoJson: GeoJSON.GeoJSON;

  beforeEach(() => {
    fakeGeoJson = {
      type: 'FeatureCollection',
      features: [],
    };
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
    it('makes request to backend', () => {
      const httpTestingController = TestBed.inject(HttpTestingController);

      service.getBoundaryShapes().subscribe(res => {
        expect(res).toEqual(fakeGeoJson);
      });

      const req = httpTestingController.expectOne(
        'http://127.0.0.1:8000/boundary/boundary_details/?boundary_name=tcsi_huc12'
      );
      expect(req.request.method).toEqual('GET');
      req.flush(fakeGeoJson);
      httpTestingController.verify();
    });
  });

  describe('getExistingProjects', () => {
    it('makes request to endpoint', () => {
      const httpTestingController = TestBed.inject(HttpTestingController);

      service.getExistingProjects().subscribe(res => {
        expect(res).toEqual(fakeGeoJson);
      });

      const req = httpTestingController.expectOne(
        'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/ArcGIS/rest/services/CMDash_v3_view/FeatureServer/2/query?where=1%3D1&outFields=PROJECT_NAME%2CPROJECT_STATUS&f=GEOJSON'
      );
      expect(req.request.method).toEqual('GET');
      req.flush(fakeGeoJson);
      httpTestingController.verify();
    });
  });

  describe('getRegionBoundary', () => {
    it('uses the correct path to the corresponding geoJSON file', () => {
      const httpTestingController = TestBed.inject(HttpTestingController);

      service.getRegionBoundary(Region.SIERRA_NEVADA).subscribe(res => {
        expect(res).toEqual(fakeGeoJson);
      });

      const req = httpTestingController.expectOne(
        'assets/geojson/sierra_nevada_region.geojson'
      );
      expect(req.request.method).toEqual('GET');
      req.flush(fakeGeoJson);
      httpTestingController.verify();
    });
  });
});
