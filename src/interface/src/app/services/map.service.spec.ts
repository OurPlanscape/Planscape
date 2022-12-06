import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { BackendConstants } from '../backend-constants';
import { MapService } from './map.service';
import { BoundaryConfig, ConditionsConfig, Region } from '../types';

describe('MapService', () => {
  let httpTestingController: HttpTestingController;
  let service: MapService;
  let fakeGeoJson: GeoJSON.GeoJSON;

  const boundaryConfigs: BoundaryConfig[] = [];

  const conditionsConfig: ConditionsConfig = {
    pillars: [],
  };

  beforeEach(() => {
    fakeGeoJson = {
      type: 'FeatureCollection',
      features: [],
    };
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MapService],
    });
    service = TestBed.inject(MapService);
    httpTestingController = TestBed.inject(HttpTestingController);

    // Must flush the requests in the constructor for httpTestingController.verify()
    // to pass in other tests.
    const req1 = httpTestingController.expectOne(
      BackendConstants.END_POINT + '/boundary/boundary'
    );
    req1.flush(conditionsConfig);
    const req2 = httpTestingController.expectOne(
      BackendConstants.END_POINT +
        '/conditions/config/?region_name=sierra_cascade_inyo'
    );
    req2.flush(conditionsConfig);
  });

  it('can load instance', () => {
    expect(service).toBeTruthy();
  });

  describe('getBoundaryShapes', () => {
    it('makes request to backend', () => {
      service
        .getBoundaryShapes('huc12', Region.SIERRA_NEVADA)
        .subscribe((res) => {
          expect(res).toEqual(fakeGeoJson);
        });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT +
          '/boundary/boundary_details/?boundary_name=huc12&region_name=sierra_cascade_inyo'
      );
      expect(req.request.method).toEqual('GET');
      req.flush(fakeGeoJson);
      httpTestingController.verify();
    });
  });

  describe('getExistingProjects', () => {
    it('makes request to endpoint', () => {
      const fakeGeoJsonText: string = JSON.stringify(fakeGeoJson);

      service.getExistingProjects().subscribe((res) => {
        expect(res).toEqual(fakeGeoJson);
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT + '/projects'
      );
      expect(req.request.method).toEqual('GET');
      req.flush(fakeGeoJsonText);
      httpTestingController.verify();
    });
  });

  describe('getRegionBoundary', () => {
    it('uses the correct path to the corresponding geoJSON file', () => {
      service.getRegionBoundary(Region.SIERRA_NEVADA).subscribe((res) => {
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
