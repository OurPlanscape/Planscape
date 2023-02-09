import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { BehaviorSubject, of } from 'rxjs';
import { MapService, PlanService } from 'src/app/services';
import { MaterialModule } from 'src/app/material/material.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ProjectConfig } from 'src/app/types';

import { ScenarioConfigurationsComponent } from './scenario-configurations.component';

describe('ScenarioConfigurationsComponent', () => {
  let component: ScenarioConfigurationsComponent;
  let fixture: ComponentFixture<ScenarioConfigurationsComponent>;
  let loader: HarnessLoader;
  let fakeMapService: MapService;
  let fakePlanService: PlanService;

  let fakeConfigs: ProjectConfig[];

  beforeEach(async () => {
    fakeConfigs = [
      {
        id: 1,
        priorities: ['fake_priority'],
      },
      {
        id: 2,
        priorities: [],
      },
    ];

    let nameMap = new Map<string, string>();
    nameMap.set('fake_priority', 'fake_display_priority');

    fakeMapService = jasmine.createSpyObj<MapService>(
      'MapService',
      {},
      {
        conditionNameToDisplayNameMap$: new BehaviorSubject(nameMap),
      }
    );

    fakePlanService = jasmine.createSpyObj<PlanService>(
      'PlanService',
      {
        deleteProjects: of([1]),
        getProjectsForPlan: of(fakeConfigs),
      },
      {}
    );

    await TestBed.configureTestingModule({
      imports: [MaterialModule, NoopAnimationsModule],
      declarations: [ScenarioConfigurationsComponent],
      providers: [
        {
          provide: MapService,
          useValue: fakeMapService,
        },
        {
          provide: PlanService,
          useValue: fakePlanService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioConfigurationsComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should get a list of scenario configs', () => {
    expect(fakePlanService.getProjectsForPlan).toHaveBeenCalled();
    expect(component.configurations).toEqual(fakeConfigs);
  });

  it('should show delete button if at least one config is selected', () => {
    expect(component.showDeleteButton()).toBeFalse();

    component.configurations[0].selected = true;

    expect(component.showDeleteButton()).toBeTrue();
  });

  it('should show continue button if exactly one config is selected', () => {
    expect(component.showContinueButton()).toBeFalse();

    component.configurations[0].selected = true;

    expect(component.showContinueButton()).toBeTrue();

    component.configurations[1].selected = true;

    expect(component.showContinueButton()).toBeFalse();
  });

  it('should call service when delete button is clicked', async () => {
    component.configurations[0].selected = true;
    component.configurations[1].selected = true;
    let deleteButton = await loader.getHarness(
      MatButtonHarness.with({ text: /DELETE/ })
    );

    await deleteButton.click();

    expect(fakePlanService.deleteProjects).toHaveBeenCalledOnceWith([1, 2]);
  });

  it('should map priorities to display names', () => {
    expect(component.displayPriorities(fakeConfigs[0].priorities!)).toEqual([
      'fake_display_priority',
    ]);
  });

  it('should open config when continue button is clicked', async () => {
    spyOn(component.openConfigEvent, 'emit');
    component.configurations[0].selected = true;
    let continueButton = await loader.getHarness(
      MatButtonHarness.with({ text: /CONTINUE/ })
    );

    await continueButton.click();

    expect(component.openConfigEvent.emit).toHaveBeenCalledOnceWith(1);
  });
});
