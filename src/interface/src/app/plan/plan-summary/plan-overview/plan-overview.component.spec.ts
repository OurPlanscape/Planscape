import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
import { PlanService, PlanState } from 'src/app/services';
import { PlanOverviewComponent } from './plan-overview.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('PlanOverviewComponent', () => {
  let component: PlanOverviewComponent;
  let fixture: ComponentFixture<PlanOverviewComponent>;
  let fakePlanService: PlanService;

  beforeEach(async () => {
    fakePlanService = jasmine.createSpyObj<PlanService>(
      'PlanService',
      {
        createProjectInPlan: of(1),
        getProjectsForPlan: of([]),
        getScenariosForPlan: of([]),
      },
      {
        planState$: new BehaviorSubject<PlanState>({
          all: {},
          currentPlanId: '1',
          currentConfigId: null,
          currentScenarioId: null,
          mapConditionLayer: null,
          mapShapes: null,
        }),
      }
    );

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MaterialModule, RouterTestingModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      declarations: [PlanOverviewComponent],
      providers: [
        {
          provide: PlanService,
          useValue: fakePlanService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opening a config should navigate', () => {
    const route = fixture.debugElement.injector.get(ActivatedRoute);
    const router = fixture.debugElement.injector.get(Router);
    spyOn(router, 'navigate');

    component.openConfig(2);

    expect(router.navigate).toHaveBeenCalledOnceWith(['config', 2], {
      relativeTo: route,
    });
  });
});
