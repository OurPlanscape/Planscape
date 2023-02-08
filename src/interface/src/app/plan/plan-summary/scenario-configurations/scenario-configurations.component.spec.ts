import { ProjectConfig } from 'src/app/types';
import { of } from 'rxjs';
import { PlanService } from 'src/app/services';
import { MaterialModule } from 'src/app/material/material.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioConfigurationsComponent } from './scenario-configurations.component';

describe('UnsavedScenariosComponent', () => {
  let component: ScenarioConfigurationsComponent;
  let fixture: ComponentFixture<ScenarioConfigurationsComponent>;
  let fakePlanService: PlanService;

  const fakeConfig: ProjectConfig = {
    id: 1
  };

  beforeEach(async () => {
    fakePlanService = jasmine.createSpyObj<PlanService>(
      'PlanService',
      {
        getProjects: of([fakeConfig])
      },
      {}
    );

    await TestBed.configureTestingModule({
      imports: [ MaterialModule ],
      declarations: [ ScenarioConfigurationsComponent ],
      providers: [
        {
          provide: PlanService, useValue: fakePlanService
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScenarioConfigurationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should get a list of scenario configs', () => {
    expect(fakePlanService.getProjects).toHaveBeenCalled();
    expect(component.configurations).toEqual([fakeConfig]);
  });
});
