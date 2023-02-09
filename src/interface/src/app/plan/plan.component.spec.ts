import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { Plan, Region } from 'src/app/types';

import { MaterialModule } from '../material/material.module';
import { PlanService } from './../services/plan.service';
import { PlanMapComponent } from './plan-map/plan-map.component';
import { PlanOverviewComponent } from './plan-summary/plan-overview/plan-overview.component';
import { PlanComponent } from './plan.component';
import { PlanModule } from './plan.module';

describe('PlanComponent', () => {
  let component: PlanComponent;
  let fixture: ComponentFixture<PlanComponent>;

  const fakeGeoJson: GeoJSON.GeoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [10, 20],
                [10, 30],
                [15, 15],
              ],
            ],
          ],
        },
        properties: {
          shape_name: 'Test',
        },
      },
    ],
  };

  const fakePlan: Plan = {
    id: 'temp',
    name: 'somePlan',
    ownerId: 'owner',
    region: Region.SIERRA_NEVADA,
    planningArea: fakeGeoJson,
  };

  beforeEach(async () => {
    const fakeRoute = jasmine.createSpyObj(
      'ActivatedRoute',
      {},
      {
        snapshot: {
          paramMap: convertToParamMap({ id: '24' }),
        },
      }
    );

    const fakeService = jasmine.createSpyObj('PlanService', {
      getPlan: of(fakePlan),
      getProjectsForPlan: of([]),
    });

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        MaterialModule,
        PlanModule,
        RouterTestingModule.withRoutes([]),
      ],
      declarations: [PlanComponent, PlanMapComponent, PlanOverviewComponent],
      providers: [
        { provide: ActivatedRoute, useValue: fakeRoute },
        { provide: PlanService, useValue: fakeService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('currentPlanStep should be 0', () => {
    expect(component.currentPlanStep).toBe(0);
  });

  it('fetches plan from service using ID', () => {
    expect(component.planNotFound).toBeFalse();
    expect(component.plan).toEqual(fakePlan);
  });

  it('opening a config advances the plan step', () => {
    component.openConfig(1);

    expect(component.openConfigId).toEqual(1);
    expect(component.currentPlanStep).toBe(1);
  });
});
