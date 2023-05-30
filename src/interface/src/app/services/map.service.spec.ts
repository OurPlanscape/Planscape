import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { BackendConstants } from '../backend-constants';
import { MapService } from './map.service';
import { of, Observable } from 'rxjs';
import {
  BoundaryConfig,
  ColormapConfig,
  ConditionsConfig,
  Region,
} from '../types';
import * as L from 'leaflet';
import "leaflet.vectorgrid";

describe('MapService', () => {
  let httpTestingController: HttpTestingController;
  let service: MapService;
  let fakeGeoJson: GeoJSON.GeoJSON;
  let fakeVector: Observable<L.Layer>;

  const boundaryConfigs: BoundaryConfig[] = [];

  const conditionsConfig: ConditionsConfig = {
    pillars: [
      {
        pillar_name: 'pillar',
        display_name: 'pillar_display',
      },
    ],
  };

  beforeEach(() => {
    fakeGeoJson = {
      type: 'FeatureCollection',
      features: [],
    };
    fakeVector = of(L.vectorGrid.protobuf(
      "https://dev-geo.planscape.org/geoserver/gwc/service/tms/1.0.0/sierra-nevada:vector_huc12@EPSG%3A3857@pbf/{z}/{x}/{-y}.pbf",
      {vectorTileLayerStyles: {
        vector_huc12: { // To set style value for every layer name (which is the value after '<region>:' in vectorName)
          weight: 1,
          fillOpacity: 0,
          color: '#0000ff',
          fill: true,
        }
      },
        interactive: true,
        zIndex: 1000, // To ensure boundary is loaded in on top of any other layers
        getFeatureId: function(f:any) {
          return f.properties.OBJECTID; // Every boundary feature must have a unique value OBJECTID in order to for hover info to properly work
        },
        maxZoom: 13, }));
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MapService],
    });
    service = TestBed.inject(MapService);
    httpTestingController = TestBed.inject(HttpTestingController);

    // Must flush the requests in the constructor for httpTestingController.verify()
    // to pass in other tests.
    const req1 = httpTestingController.expectOne(
      BackendConstants.END_POINT + '/boundary/config/?region_name=sierra_cascade_inyo'
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

  it('populates condition display name map', () => {
    const nameMap = new Map<string, string>([['pillar', 'pillar_display']]);

    expect(service.conditionNameToDisplayNameMap$.value).toEqual(nameMap);
  });

  describe('getBoundaryShapes', () => {
    it('gets shapes from the assets', () => {
      // service
      //   .getBoundaryShapes("sierra-nevada:vector_huc12", "Name")
      //   .subscribe((res) => { fakeVector.subscribe((fake) => {
      //     expect(res).toEqual(fake);
      //   })
      //   });
      service
        .getBoundaryShapes("sierra-nevada:vector_huc12", "Name")
        .subscribe((res) => { 
          expect(res).toBeTruthy();
        })

      // const req = httpTestingController.expectOne(
      //   'assets/geojson/sierra_cascade_inyo/huc12.geojson'
      // );
      // expect(req.request.method).toEqual('GET');
      // req.flush(fakeGeoJson);
      // httpTestingController.verify();
    });

    // it('makes request to backend if unknown boundary shape', () => {
    //   service
    //     .getBoundaryShapes('huc12_fake', 'fake_Name')
    //     .subscribe((res) => {
    //       expect(res).toEqual(fakeVector);
    //     });

    //   const req = httpTestingController.expectOne(
    //     BackendConstants.END_POINT +
    //       '/boundary/boundary_details/?boundary_name=huc12_fake&region_name=sierra_cascade_inyo'
    //   );
    //   expect(req.request.method).toEqual('GET');
    //   req.flush(fakeGeoJson);
    //   httpTestingController.verify();
    // });
  });

  describe('getExistingProjects', () => {
    it('makes request to endpoint', () => {
      const fakeGeoJsonText: string = JSON.stringify(fakeGeoJson);

      service.getExistingProjects().subscribe((res) => {
        expect(res).toEqual(fakeGeoJson);
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT + '/projects/calmapper'
      );
      expect(req.request.method).toEqual('GET');
      req.flush(fakeGeoJsonText);
      httpTestingController.verify();
    });
  });

  // describe('getRegionBoundary', () => {
  //   it('uses the correct path to the corresponding geoJSON file', () => {
  //     service.getRegionBoundary(Region.SIERRA_NEVADA).subscribe((res) => {
  //       expect(res).toEqual(fakeGeoJson);
  //     });

  //     const req = httpTestingController.expectOne(
  //       'assets/geojson/sierra_nevada_region.geojson'
  //     );
  //     expect(req.request.method).toEqual('GET');
  //     req.flush(fakeGeoJson);
  //     httpTestingController.verify();
  //   });
  // });

  describe('getColormap', () => {
    it('makes request to endpoint', () => {
      const fakeColormapConfig: ColormapConfig = {
        name: 'fakecolormap',
        values: [
          {
            rgb: '#000000',
            name: 'fakelabel',
          },
        ],
      };

      service.getColormap('fakecolormap').subscribe((colormapConfig) => {
        expect(colormapConfig).toEqual(fakeColormapConfig);
      });

      const req = httpTestingController.expectOne(
        BackendConstants.END_POINT.concat(
          '/conditions/colormap/?colormap=fakecolormap'
        )
      );
      expect(req.request.method).toEqual('GET');
      req.flush(fakeColormapConfig);
      httpTestingController.verify();
    });
  });
});
