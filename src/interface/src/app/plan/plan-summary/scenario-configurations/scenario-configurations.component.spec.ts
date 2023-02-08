import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ProjectConfig } from 'src/app/types';
import { BehaviorSubject, of } from 'rxjs';
import { MapService, PlanService } from 'src/app/services';
import { MaterialModule } from 'src/app/material/material.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioConfigurationsComponent } from './scenario-configurations.component';

describe('ScenarioConfigurationsComponent', () => {
  let component: ScenarioConfigurationsComponent;
  let fixture: ComponentFixture<ScenarioConfigurationsComponent>;
  let fakeMapService: MapService;
  let fakePlanService: PlanService;

  const fakeConfig: ProjectConfig = {
    id: 1,
    priorities: ['fake_priority']
  };

  beforeEach(async () => {
    let nameMap = new Map<string, string>();
    nameMap.set('fake_priority', 'fake_display_priority');

    fakeMapService = jasmine.createSpyObj<MapService>(
      'MapService',
      {},
      {
        conditionNameToDisplayNameMap$: new BehaviorSubject(nameMap)
      }
    );
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
          provide: MapService, useValue: fakeMapService
        },
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

  it('should map priorities to display names', () => {
    expect(component.displayPriorities(fakeConfig.priorities!)).toEqual(['fake_display_priority']);
  });
});
