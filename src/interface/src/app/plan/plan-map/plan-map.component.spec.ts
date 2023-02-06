import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { Router } from '@angular/router';
import { featureCollection, point } from '@turf/helpers';
import * as L from 'leaflet';
import { BehaviorSubject } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
import { Plan, Region } from 'src/app/types';

import { PlanMapComponent } from './plan-map.component';

describe('PlanMapComponent', () => {
  let component: PlanMapComponent;
  let fixture: ComponentFixture<PlanMapComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    const routerStub = () => ({ navigate: (array: string[]) => ({}) });

    await TestBed.configureTestingModule({
      imports: [MaterialModule],
      declarations: [PlanMapComponent],
      providers: [{ provide: Router, useFactory: routerStub }],
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
    component.plan = new BehaviorSubject<Plan | null>({
      id: 'fake',
      name: 'fake',
      ownerId: 'fake',
      region: Region.SIERRA_NEVADA,
      planningArea: new L.Polygon([
        new L.LatLng(38.715517043571914, -120.42857302225725),
        new L.LatLng(38.47079787227401, -120.5164425608172),
        new L.LatLng(38.52668443555346, -120.11828371421737),
      ]).toGeoJSON(),
    });
    component.ngAfterViewInit();

    let foundPlanningAreaLayer = false;

    component.map.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) {
        if (
          (layer as L.GeoJSON).toGeoJSON().bbox ===
          component.plan.value?.planningArea!.bbox
        ) {
          foundPlanningAreaLayer = true;
        }
      }
    });

    expect(foundPlanningAreaLayer).toBeTrue();
  });

  it('should add tile layer to map', () => {
    expect(component.tileLayer).toBeUndefined();

    component.setCondition('filepath');

    expect(component.tileLayer).toBeDefined();
  });

  describe('expand map button', () => {
    it('should navigate to map view when clicked'),
      async () => {
        const routerStub: Router = fixture.debugElement.injector.get(Router);
        spyOn(routerStub, 'navigate').and.callThrough();
        const button = await loader.getHarness(
          MatButtonHarness.with({ text: 'EXPAND MAP' })
        );

        await button.click();

        expect(routerStub.navigate).toHaveBeenCalledOnceWith(['map']);
      };
  });

  describe('draw shapes on map', () => {
    it('should draw project areas when drawShapes is called with geojson', () => {
      const shapes = featureCollection([point([-75.343, 39.984])]);

      component.drawShapes(shapes);

      expect(component.projectAreasLayer).toBeDefined();
      expect(component.map.hasLayer(component.projectAreasLayer!)).toBeTrue();
    });

    it('should remove project areas layer when drawShapes is called with null', () => {
      const shapes = featureCollection([point([-75.343, 39.984])]);

      component.drawShapes(shapes);
      component.drawShapes(null);

      expect(component.projectAreasLayer).toBeDefined();
      expect(component.map.hasLayer(component.projectAreasLayer!)).toBeFalse();
    });
  });
});
