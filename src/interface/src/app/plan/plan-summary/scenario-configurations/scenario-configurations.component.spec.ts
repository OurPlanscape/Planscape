import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
import { PlanService } from 'src/app/services';
import { ProjectConfig } from 'src/app/types';

import { ScenarioConfigurationsComponent } from './scenario-configurations.component';

describe('UnsavedScenariosComponent', () => {
  let component: ScenarioConfigurationsComponent;
  let fixture: ComponentFixture<ScenarioConfigurationsComponent>;
  let loader: HarnessLoader;
  let fakePlanService: PlanService;

  let fakeConfigs: ProjectConfig[];

  beforeEach(async () => {
    fakeConfigs = [
      {
        id: 1,
      },
      {
        id: 2,
      },
    ];

    fakePlanService = jasmine.createSpyObj<PlanService>(
      'PlanService',
      {
        deleteProjects: of([1]),
        getProjects: of(fakeConfigs),
      },
      {}
    );

    await TestBed.configureTestingModule({
      imports: [MaterialModule, NoopAnimationsModule],
      declarations: [ScenarioConfigurationsComponent],
      providers: [
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
    expect(fakePlanService.getProjects).toHaveBeenCalled();
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
    let deleteButton = await loader.getHarness(MatButtonHarness);

    await deleteButton.click();

    expect(fakePlanService.deleteProjects).toHaveBeenCalledOnceWith([1, 2]);
  });
});
