import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';
import { PlanService } from 'src/app/services';
import { Plan, Region } from 'src/app/types';

import { PlanModule } from '../plan.module';
import { CreateScenariosComponent } from './create-scenarios.component';

describe('CreateScenariosComponent', () => {
  let component: CreateScenariosComponent;
  let fixture: ComponentFixture<CreateScenariosComponent>;
  let fakePlanService: PlanService;

  beforeEach(async () => {
    fakePlanService = jasmine.createSpyObj<PlanService>(
      'PlanService',
      {
        createProjectInPlan: of(1),
        getConditionScoresForPlanningArea: of(),
        getProject: of({
          id: 1,
          maxBudget: 100,
        }),
        updateProject: of(1),
      },
      {}
    );

    await TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, HttpClientTestingModule, PlanModule],
      declarations: [CreateScenariosComponent],
      providers: [{ provide: PlanService, useValue: fakePlanService }],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateScenariosComponent);
    component = fixture.componentInstance;

    component.plan$ = new BehaviorSubject<Plan | null>({
      id: '1',
      ownerId: 'fakeowner',
      name: 'testplan',
      region: Region.SIERRA_NEVADA,
    });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('stepper should begin on the first step', () => {
    expect(component.stepper?.selectedIndex).toEqual(0);
  });

  it('should create a new project when initialized with no config ID', () => {
    expect(fakePlanService.createProjectInPlan).toHaveBeenCalledOnceWith('1');
  });

  it('should load existing config into form when initialized with config ID', () => {
    component.scenarioConfigId = 1;
    component.ngOnInit();

    expect(fakePlanService.getProject).toHaveBeenCalledOnceWith(1);

    component.formGroups[1].valueChanges.subscribe((_) => {
      expect(
        component.formGroups[1].get('budgetForm.maxBudget')?.value
      ).toEqual(100);
    });
  });

  it('should update project when stepper advances', () => {
    component.formGroups[0].get('priorities')?.setValue(['test']);
    component.stepper?.next();

    expect(fakePlanService.updateProject).toHaveBeenCalledOnceWith({
      id: 1,
      max_treatment_area_ratio: NaN,
      max_road_distance: NaN,
      max_slope: NaN,
      priorities: ['test'],
    });
  });

  it('should not update project if form is invalid', () => {
    expect(fakePlanService.updateProject).toHaveBeenCalledTimes(0);

    component.formGroups[0].markAsDirty();
    component.formGroups[0].get('priorities')?.setValue(['test']);
    component.stepper?.next();

    expect(fakePlanService.updateProject).toHaveBeenCalledTimes(1);
  });

  it('emits drawShapes event when "identify project areas" form inputs change', () => {
    const generateAreas = component.formGroups[2].get('generateAreas');
    const uploadedArea = component.formGroups[2].get('uploadedArea');
    spyOn(component.drawShapesEvent, 'emit');

    // Set "generate areas automatically" to true
    generateAreas?.setValue(true);

    expect(component.drawShapesEvent.emit).toHaveBeenCalledWith(null);

    // Add an uploaded area and set "generate areas automatically" to false
    generateAreas?.setValue(false);
    uploadedArea?.setValue('testvalue');

    expect(component.drawShapesEvent.emit).toHaveBeenCalledWith('testvalue');
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
});
