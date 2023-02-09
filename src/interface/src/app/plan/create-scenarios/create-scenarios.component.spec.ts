import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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

  it('advancing the stepper is blocked if the step form is invalid', () => {
    component.stepper?.next();

    expect(component.stepper?.selectedIndex).toEqual(0);
  });

  it('stepper advances automatically when step 1 form is valid', () => {
    component.formGroups[0].get('scoreSelectCtrl')?.setValue('test');

    expect(component.stepper?.selectedIndex).toEqual(1);
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

  it('should update project when values change', () => {
    component.formGroups[0].get('scoreSelectCtrl')?.setValue('test');

    expect(fakePlanService.updateProject).toHaveBeenCalledOnceWith({
      id: 1,
      max_road_distance: NaN,
      max_slope: NaN,
    });
  });

  it('should not update project if form is invalid', () => {
    component.formGroups[1].markAsDirty();
    component.formGroups[1].get('budgetForm.maxBudget')?.setValue(-1);

    expect(fakePlanService.updateProject).toHaveBeenCalledTimes(0);
  });

  it('emits drawShapes event when "identify project areas" form inputs change', () => {
    const generateAreas = component.formGroups[3].get('generateAreas');
    const uploadedArea = component.formGroups[3].get('uploadedArea');
    spyOn(component.drawShapesEvent, 'emit');

    // Set "generate areas automatically" to true
    generateAreas?.setValue(true);

    expect(component.drawShapesEvent.emit).toHaveBeenCalledWith(null);

    // Add an uploaded area and set "generate areas automatically" to false
    generateAreas?.setValue(false);
    uploadedArea?.setValue('testvalue');

    expect(component.drawShapesEvent.emit).toHaveBeenCalledWith('testvalue');
  });
});
