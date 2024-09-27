import {
  ComponentFixture,
  fakeAsync,
  flush,
  TestBed,
} from '@angular/core/testing';
import { Router } from '@angular/router';
import { featureCollection, point } from '@turf/helpers';
import * as L from 'leaflet';
import { BehaviorSubject } from 'rxjs';
import { LegacyMaterialModule } from '../../material/legacy-material.module';
import { Plan, Region } from '@types';

import { PlanMapComponent } from './plan-map.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PlanState, PlanStateService } from '@services';
import { MOCK_PLAN } from '@services/mocks';

describe('PlanMapComponent', () => {
  let component: PlanMapComponent;
  let fixture: ComponentFixture<PlanMapComponent>;
  let fakePlanService: PlanStateService;
  let fakePlanState$: BehaviorSubject<PlanState>;
  let fakePlan: Plan;

  const emptyPlanState = {
    all: {},
    currentPlanId: null,
    currentConfigId: null,
    currentScenarioId: null,
    mapConditionLayer: null,
    mapShapes: null,
    legendUnits: null,
  };

  beforeEach(async () => {
    fakePlan = {
      ...MOCK_PLAN,
      area_acres: 123,
      area_m2: 231,
      geometry: new L.Polygon([
        new L.LatLng(38.715517043571914, -120.42857302225725),
        new L.LatLng(38.47079787227401, -120.5164425608172),
        new L.LatLng(38.52668443555346, -120.11828371421737),
      ]).toGeoJSON(),
    };

    fakePlanState$ = new BehaviorSubject<PlanState>({
      ...emptyPlanState,
    });

    fakePlanService = jasmine.createSpyObj<PlanStateService>(
      'PlanStateService',
      [],
      {
        planState$: fakePlanState$,
        planRegion$: new BehaviorSubject<Region>(Region.SIERRA_NEVADA),
      }
    );

    const routerStub = () => ({ navigate: (array: string[]) => ({}) });

    await TestBed.configureTestingModule({
      imports: [LegacyMaterialModule, HttpClientTestingModule],
      declarations: [PlanMapComponent],
      providers: [
        {
          provide: PlanStateService,
          useValue: fakePlanService,
        },
        { provide: Router, useFactory: routerStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add planning area to map', fakeAsync(() => {
    component.plan = fakePlan;
    component.ngAfterViewInit();

    let foundPlanningAreaLayer = false;

    component.map.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) {
        if (
          (layer as L.GeoJSON).toGeoJSON().bbox ===
          component.plan!.geometry!.bbox
        ) {
          foundPlanningAreaLayer = true;
        }
      }
    });
    flush();

    expect(foundPlanningAreaLayer).toBeTrue();
  }));

  it('should add tile layer to map', () => {
    expect(component.tileLayer).toBeUndefined();

    fakePlanState$.next({
      ...emptyPlanState,
      mapConditionLayer: 'layer',
    });

    expect(component.tileLayer).toBeDefined();
  });

  describe('draw shapes on map', () => {
    it('should draw project areas when drawShapes is called with geojson', () => {
      const shapes = featureCollection([point([-75.343, 39.984])]);

      fakePlanState$.next({
        ...emptyPlanState,
        mapShapes: shapes.features,
      });

      expect(component.projectAreasLayer).toBeDefined();
      expect(component.map.hasLayer(component.projectAreasLayer!)).toBeTrue();
    });

    it('should remove project areas layer when drawShapes is called with null', () => {
      const shapes = featureCollection([point([-75.343, 39.984])]);

      fakePlanState$.next({
        ...emptyPlanState,
        mapShapes: shapes.features,
      });
      fakePlanState$.next({
        ...emptyPlanState,
        mapShapes: null,
      });
      fixture.detectChanges();

      expect(component.projectAreasLayer).toBeDefined();
      expect(component.map.hasLayer(component.projectAreasLayer!)).toBeFalse();
    });
  });
});
