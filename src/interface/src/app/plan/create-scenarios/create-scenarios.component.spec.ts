import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { PlanService, PlanState } from 'src/app/services';
import { Region } from 'src/app/types';

import { PlanModule } from '../plan.module';
import { CreateScenariosComponent } from './create-scenarios.component';

describe('CreateScenariosComponent', () => {
  let component: CreateScenariosComponent;
  let fixture: ComponentFixture<CreateScenariosComponent>;
  let fakePlanService: PlanService;
  let fakeGeoJson: GeoJSON.GeoJSON;

  beforeEach(async () => {
    fakeGeoJson = {
      type: 'FeatureCollection',
      features: [],
    };
    fakePlanService = jasmine.createSpyObj<PlanService>(
      'PlanService',
      {
        getConditionScoresForPlanningArea: of(),
        getProject: of({
          id: 1,
          maxBudget: 100,
        }),
        updateProject: of(1),
        createProjectArea: of(1),
        createScenario: of('1'),
        updateStateWithShapes: undefined,
      },
      {
        planState$: new BehaviorSubject<PlanState>({
          all: {
            '1': {
              id: '1',
              ownerId: 'fakeowner',
              name: 'testplan',
              region: Region.SIERRA_NEVADA,
            },
          },
          currentPlanId: '1',
          currentConfigId: 1,
          currentScenarioId: null,
          mapConditionFilepath: null,
          mapShapes: null,
          panelExpanded: true,
        }),
      }
    );

    await TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, HttpClientTestingModule, PlanModule],
      declarations: [CreateScenariosComponent],
      providers: [{ provide: PlanService, useValue: fakePlanService }],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateScenariosComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('stepper should begin on the first step', () => {
    expect(component.stepper?.selectedIndex).toEqual(0);
  });

  it('should load existing config into form', () => {
    expect(fakePlanService.getProject).toHaveBeenCalledOnceWith(1);

    component.formGroups[1].valueChanges.subscribe((_) => {
      expect(
        component.formGroups[1].get('budgetForm.maxCost')?.value
      ).toEqual(100);
    });
  });

  it('should update project when stepper advances', () => {
    component.formGroups[0].get('priorities')?.setValue(['test']);
    component.stepper?.next();

    expect(fakePlanService.updateProject).toHaveBeenCalledOnceWith({
      id: 1,
      planId: 1,
      est_cost: NaN,
      max_budget: NaN,
      max_treatment_area_ratio: NaN,
      max_road_distance: NaN,
      max_slope: NaN,
      priorities: ['test'],
      weights: [1],
    });
  });

  it('should not update project if form is invalid', () => {
    expect(fakePlanService.updateProject).toHaveBeenCalledTimes(0);

    component.formGroups[0].markAsDirty();
    component.formGroups[0].get('priorities')?.setValue(['test']);
    component.stepper?.next();

    expect(fakePlanService.updateProject).toHaveBeenCalledTimes(1);
  });

  it('update plan state when "identify project areas" form inputs change', () => {
    const generateAreas = component.formGroups[2].get('generateAreas');
    const uploadedArea = component.formGroups[2].get('uploadedArea');

    // Set "generate areas automatically" to true
    generateAreas?.setValue(true);

    expect(fakePlanService.updateStateWithShapes).toHaveBeenCalledWith(null);

    // Add an uploaded area and set "generate areas automatically" to false
    generateAreas?.setValue(false);
    uploadedArea?.setValue('testvalue');

    expect(fakePlanService.updateStateWithShapes).toHaveBeenCalledWith(
      'testvalue'
    );
  });

  it('adds a priority weight form control for each priority', () => {
    component.formGroups[0]
      .get('priorities')
      ?.setValue(['priority1', 'priority2']);
    const priorityWeightsForm = component.formGroups[3].get(
      'priorityWeightsForm'
    ) as FormGroup;

    expect(priorityWeightsForm.value).toEqual({
      priority1: 1,
      priority2: 1,
    });
  });

  it('creates scenario when event is emitted', () => {
    component.scenarioConfigId = 1;
    component.formGroups[0].get('priorities')?.setValue(['test']);
    const router = fixture.debugElement.injector.get(Router);
    spyOn(router, 'navigate');

    component.createScenarioAndProjectArea();

    expect(fakePlanService.createScenario).toHaveBeenCalledOnceWith({
      id: 1,
      planId: 1,
      est_cost: NaN,
      max_budget: NaN,
      max_treatment_area_ratio: NaN,
      max_road_distance: NaN,
      max_slope: NaN,
      priorities: ['test'],
      weights: [1],
    });
    expect(router.navigate).toHaveBeenCalledOnceWith([
      'scenario-confirmation',
      '1',
    ]);
  });

  it('creates uploaded project area when event is emitted', () => {
    component.scenarioConfigId = 1;
    component.formGroups[0].get('priorities')?.setValue(['test']);
    component.formGroups[2].get('uploadedArea')?.setValue(fakeGeoJson);
    const router = fixture.debugElement.injector.get(Router);
    spyOn(router, 'navigate');

    component.createScenarioAndProjectArea();

    expect(fakePlanService.createProjectArea).toHaveBeenCalledOnceWith(
      component.scenarioConfigId,
      fakeGeoJson
    );
  });
});
