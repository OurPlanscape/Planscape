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

  describe('getHUC12BoundaryShapes', () => {
    it('makes request to backend', () => {
      const httpTestingController = TestBed.inject(HttpTestingController);

      service.getHUC12BoundaryShapes(Region.SIERRA_NEVADA).subscribe(res => {
        expect(res).toEqual(fakeGeoJson);
      });

      const req = httpTestingController.expectOne(
        'http://127.0.0.1:8000/boundary/boundary_details/?boundary_name=huc12&region_name=SierraNevada'
      );
      expect(req.request.method).toEqual('GET');
      req.flush(fakeGeoJson);
      httpTestingController.verify();
    });
  });

  describe('getCountyBoundaryShapes', () => {
    it('makes request to backend', () => {
      const httpTestingController = TestBed.inject(HttpTestingController);

      service.getCountyBoundaryShapes(Region.NORTHERN_CALIFORNIA).subscribe(res => {
        expect(res).toEqual(fakeGeoJson);
      });

      const req = httpTestingController.expectOne(
        'http://127.0.0.1:8000/boundary/boundary_details/?boundary_name=counties&region_name=NorthernCalifornia'
      );
      expect(req.request.method).toEqual('GET');
      req.flush(fakeGeoJson);
      httpTestingController.verify();
    });
  });

  describe('getExistingProjects', () => {
    it('makes request to endpoint', () => {
      const httpTestingController = TestBed.inject(HttpTestingController);
      const fakeGeoJsonText: string = JSON.stringify(fakeGeoJson);

      service.getExistingProjects().subscribe(res => {
        expect(res).toEqual(fakeGeoJson);
      });

      const req = httpTestingController.expectOne(
        'http://127.0.0.1:8000/projects'
      );
      expect(req.request.method).toEqual('GET');
      req.flush(fakeGeoJsonText);
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
