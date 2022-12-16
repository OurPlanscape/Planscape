import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { Router } from '@angular/router';

import { PlanComponent } from './plan.component';

import * as L from 'leaflet';
import { MaterialModule } from '../material/material.module';

describe('PlanComponent', () => {
  let component: PlanComponent;
  let fixture: ComponentFixture<PlanComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    const routerStub = () => ({ navigate: (array: string[]) => ({}) });

    await TestBed.configureTestingModule({
      imports: [MaterialModule],
      declarations: [PlanComponent],
      providers: [{ provide: Router, useFactory: routerStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add planning area to map', () => {
    component.ngAfterViewInit();

    let foundPlanningAreaLayer = false;

    component.map.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) {
        if (
          (layer as L.GeoJSON).toGeoJSON().bbox ===
          component.plan?.planningArea.bbox
        ) {
          foundPlanningAreaLayer = true;
        }
      }
    });

    expect(foundPlanningAreaLayer).toBeTrue();
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
});
