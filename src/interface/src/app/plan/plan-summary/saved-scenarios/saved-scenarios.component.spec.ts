import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
import { PlanService } from 'src/app/services';
import { Region } from 'src/app/types';

import { SavedScenariosComponent } from './saved-scenarios.component';
import { POLLING_INTERVAL } from '../../plan-helpers';
import { MatButtonHarness } from '@angular/material/button/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { By } from '@angular/platform-browser';

describe('SavedScenariosComponent', () => {
  let component: SavedScenariosComponent;
  let fixture: ComponentFixture<SavedScenariosComponent>;
  let fakePlanService: PlanService;
  let loader: HarnessLoader;

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

    fakePlanService = jasmine.createSpyObj<PlanService>(
      'PlanService',
      {
        getScenariosForPlan: of([
          {
            id: '1',
            name: 'name',
            planning_area: '1',
            createdTimestamp: 100,
            configuration: {
              id: 1,
              max_budget: 200,
            },
          },
        ]),
        deleteScenarios: of(['1']),
        favoriteScenario: of({ favorited: true }),
        unfavoriteScenario: of({ favorited: false }),
      },
      {}
    );

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        HttpClientTestingModule,
        MaterialModule,
        NoopAnimationsModule,
      ],
      declarations: [SavedScenariosComponent],
      providers: [
        { provide: ActivatedRoute, useValue: fakeRoute },
        { provide: PlanService, useValue: fakePlanService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SavedScenariosComponent);
    component = fixture.componentInstance;

    component.plan = {
      id: '1',
      name: 'Fake Plan',
      ownerId: '1',
      region: Region.SIERRA_NEVADA,
    };

    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should call service for list of scenarios', () => {
    fixture.detectChanges();
    expect(fakePlanService.getScenariosForPlan).toHaveBeenCalledOnceWith('1');

    expect(component.scenarios.length).toEqual(1);
  });

  it('should delete selected scenarios', () => {
    fixture.detectChanges();
    component.highlightedId = '1';

    component.deleteSelectedScenarios();

    expect(fakePlanService.deleteScenarios).toHaveBeenCalledOnceWith(['1']);
  });

  it('clicking new configuration button should call service and navigate', fakeAsync(async () => {
    const route = fixture.debugElement.injector.get(ActivatedRoute);
    const router = fixture.debugElement.injector.get(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();

    const button = fixture.debugElement.query(
      By.css('[data-id="new-scenario"]')
    );
    button.nativeElement.click();
    expect(router.navigate).toHaveBeenCalledOnceWith(['config', ''], {
      relativeTo: route,
    });
    discardPeriodicTasks();
  }));

  it('should poll for changes', fakeAsync(() => {
    spyOn(component, 'fetchScenarios');
    fixture.detectChanges();
    expect(component.fetchScenarios).toHaveBeenCalledTimes(1);
    tick(POLLING_INTERVAL);
    fixture.detectChanges();
    expect(component.fetchScenarios).toHaveBeenCalledTimes(2);
    discardPeriodicTasks();
  }));
});
