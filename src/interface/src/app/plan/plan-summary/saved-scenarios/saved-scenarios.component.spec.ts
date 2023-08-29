import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
import { PlanService } from 'src/app/services';
import { Region } from 'src/app/types';

import { SavedScenariosComponent } from './saved-scenarios.component';

describe('SavedScenariosComponent', () => {
  let component: SavedScenariosComponent;
  let fixture: ComponentFixture<SavedScenariosComponent>;
  let fakePlanService: PlanService;

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
            createdTimestamp: 100,
            config: {
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

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call service for list of scenarios', () => {
    expect(fakePlanService.getScenariosForPlan).toHaveBeenCalledOnceWith('1');

    expect(component.scenarios.length).toEqual(1);
  });

  it('should delete selected scenarios', () => {
    component.scenarios[0].selected = true;

    component.deleteSelectedScenarios();

    expect(fakePlanService.deleteScenarios).toHaveBeenCalledOnceWith(['1']);
  });

  it('should call service to favorite a scenario', () => {
    component.toggleFavorited(component.scenarios[0]);

    expect(fakePlanService.favoriteScenario).toHaveBeenCalledOnceWith('1');
    expect(component.scenarios[0].favorited).toBeTrue();
  });

  it('should call service to unfavorite a scenario', () => {
    component.scenarios[0].favorited = true;
    component.toggleFavorited(component.scenarios[0]);

    expect(fakePlanService.unfavoriteScenario).toHaveBeenCalledOnceWith('1');
    expect(component.scenarios[0].favorited).toBeFalse();
  });
});
