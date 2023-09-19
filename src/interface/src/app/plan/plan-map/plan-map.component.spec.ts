import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { Router } from '@angular/router';
import { featureCollection, point } from '@turf/helpers';
import * as L from 'leaflet';
import { BehaviorSubject } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
import { PlanService, PlanState } from 'src/app/services';
import { Plan, Region } from 'src/app/types';

import { PlanMapComponent } from './plan-map.component';

describe('PlanMapComponent', () => {
  let component: PlanMapComponent;
  let fixture: ComponentFixture<PlanMapComponent>;
  let loader: HarnessLoader;
  let fakePlanService: PlanService;
  let fakePlanState$: BehaviorSubject<PlanState>;
  let fakePlan: Plan;

  const emptyPlanState = {
    all: {},
    currentPlanId: null,
    currentConfigId: null,
    currentScenarioId: null,
    mapConditionLayer: null,
    mapShapes: null,
    panelExpanded: true,
  };

  beforeEach(async () => {
    fakePlan = {
      id: 'fake',
      name: 'fake',
      ownerId: 'fake',
      region: Region.SIERRA_NEVADA,
      planningArea: new L.Polygon([
        new L.LatLng(38.715517043571914, -120.42857302225725),
        new L.LatLng(38.47079787227401, -120.5164425608172),
        new L.LatLng(38.52668443555346, -120.11828371421737),
      ]).toGeoJSON(),
    };
    fakePlanState$ = new BehaviorSubject<PlanState>({
      ...emptyPlanState,
    });

    fakePlanService = jasmine.createSpyObj<PlanService>(
      'PlanService',
      ['updateStateWithPanelState'],
      {
        planState$: fakePlanState$,
      }
    );

    const routerStub = () => ({ navigate: (array: string[]) => ({}) });

    await TestBed.configureTestingModule({
      imports: [MaterialModule],
      declarations: [PlanMapComponent],
      providers: [
        {
          provide: PlanService,
          useValue: fakePlanService,
        },
        { provide: Router, useFactory: routerStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanMapComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add planning area to map', () => {
    component.plan = fakePlan;
    component.ngAfterViewInit();

    let foundPlanningAreaLayer = false;

    component.map.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) {
        if (
          (layer as L.GeoJSON).toGeoJSON().bbox ===
          component.plan!.planningArea!.bbox
        ) {
          foundPlanningAreaLayer = true;
        }
      }
    });

    expect(foundPlanningAreaLayer).toBeTrue();
  });

  it('should add tile layer to map', () => {
    expect(component.tileLayer).toBeUndefined();

    fakePlanState$.next({
      ...emptyPlanState,
      mapConditionLayer: 'layer',
    });

    expect(component.tileLayer).toBeDefined();
  });

  describe('expand panel button', () => {
    it('hides button if no config or scenario is active', (done) => {
      component.showTogglePanelButton().subscribe((result) => {
        expect(result).toBeFalse();
        done();
      });
    });

    it('shows button if a config or scenario is active', (done) => {
      fakePlanState$.next({
        ...fakePlanState$.value,
        currentConfigId: 1,
      });
      component.showTogglePanelButton().subscribe((result) => {
        expect(result).toBeTrue();
        done();
      });
    });

    it('button updates plan state', async () => {
      fakePlanState$.next({
        ...fakePlanState$.value,
        currentConfigId: 1,
      });
      const button = await loader.getHarness(
        MatButtonHarness.with({ text: /COLLAPSE/ })
      );

      await button.click();

      expect(
        fakePlanService.updateStateWithPanelState
      ).toHaveBeenCalledOnceWith(false);
    });
  });

  describe('draw shapes on map', () => {
    it('should draw project areas when drawShapes is called with geojson', () => {
      const shapes = featureCollection([point([-75.343, 39.984])]);

      fakePlanState$.next({
        ...emptyPlanState,
        mapShapes: shapes,
      });

      expect(component.projectAreasLayer).toBeDefined();
      expect(component.map.hasLayer(component.projectAreasLayer!)).toBeTrue();
    });

    it('should remove project areas layer when drawShapes is called with null', () => {
      const shapes = featureCollection([point([-75.343, 39.984])]);

      fakePlanState$.next({
        ...emptyPlanState,
        mapShapes: shapes,
      });
      fakePlanState$.next({
        ...emptyPlanState,
        mapShapes: null,
      });

      expect(component.projectAreasLayer).toBeDefined();
      expect(component.map.hasLayer(component.projectAreasLayer!)).toBeFalse();
    });
  });
});
