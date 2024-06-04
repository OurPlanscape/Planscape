import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanningAreasComponent } from './planning-areas.component';
import {
  DEFAULT_SORT_OPTIONS,
  QueryParamsService,
} from './query-params.service';
import { AuthService, PlanService } from '@services';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Sort } from '@angular/material/sort';
import { BehaviorSubject, of } from 'rxjs';
import { PlanningAreasDataSource } from './planning-areas.datasource';
import { MockProvider } from 'ng-mocks';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('PlanningAreasComponent', () => {
  let component: PlanningAreasComponent;
  let fixture: ComponentFixture<PlanningAreasComponent>;
  let router: Router;
  const defaultSort: Sort = { active: 'name', direction: 'asc' };

  const mockQueryParamsService = {};
  const mockPlanningAreasDataSource = {
    loading$: new BehaviorSubject<boolean>(false),
    initialLoad$: new BehaviorSubject<boolean>(false),
    noEntries$: new BehaviorSubject<boolean>(false),
    sortOptions: defaultSort,
    loadData: jasmine.createSpy('loadData').and.returnValue(() => of([])),
    changeSort: jasmine.createSpy('changeSort'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        PlanningAreasComponent,
        NoopAnimationsModule,
      ],
      providers: [
        MockProvider(AuthService),
        MockProvider(PlanService, {
          getPlanPreviews: () =>
            of({
              count: 0,
              results: [],
            }),
        }),
        { provide: QueryParamsService, useValue: mockQueryParamsService },
        { provide: DEFAULT_SORT_OPTIONS, useValue: defaultSort },
      ],
    })
      .overrideProvider(PlanningAreasDataSource, {
        useValue: mockPlanningAreasDataSource,
      })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PlanningAreasComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should provide DEFAULT_SORT_OPTIONS', () => {
    expect(TestBed.inject(DEFAULT_SORT_OPTIONS)).toEqual(defaultSort);
  });

  it('should set up PlanningAreasDataSource', () => {
    const dataSource = TestBed.inject(PlanningAreasDataSource);
    expect(component.dataSource).toBe(dataSource);
    expect(component.dataSource.sortOptions).toEqual(defaultSort);
  });

  it('should navigate to plan on viewPlan', () => {
    const plan = { id: 123 } as any;
    spyOn(router, 'navigate');
    component.viewPlan(plan, new MouseEvent('click'));
    expect(router.navigate).toHaveBeenCalledWith(['plan', plan.id]);
  });
});
