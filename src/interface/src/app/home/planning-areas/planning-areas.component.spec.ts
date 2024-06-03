import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanningAreasComponent } from './planning-areas.component';
import {
  DEFAULT_SORT_OPTIONS,
  QueryParamsService,
} from './query-params.service';
import { PlanService } from '@services';
import { PlanningAreasDataSource } from './planning-areas.datasource';
import { BehaviorSubject, of } from 'rxjs';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MockProvider } from 'ng-mocks';
import { Sort } from '@angular/material/sort';

describe('PlanningAreasComponent', () => {
  let component: PlanningAreasComponent;
  let fixture: ComponentFixture<PlanningAreasComponent>;
  let router: Router;
  const defaultSort: Sort = { active: 'name', direction: 'asc' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [PlanningAreasComponent],
      providers: [
        MockProvider(QueryParamsService),
        MockProvider(PlanService),
        MockProvider(PlanningAreasDataSource, {
          loading$: of(false),
          initialLoad$: new BehaviorSubject(false),
          noEntries$: of(false),
          sortOptions: defaultSort,
          loadData: jasmine.createSpy('loadData'),
          changeSort: jasmine.createSpy('changeSort'),
        }),
        { provide: DEFAULT_SORT_OPTIONS, useValue: defaultSort },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PlanningAreasComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
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

  it('should load data on initialization', () => {
    const dataSource = TestBed.inject(PlanningAreasDataSource);
    component.ngOnInit();
    expect(dataSource.loadData).toHaveBeenCalled();
  });

  it('should call dataSource.changeSort on changeSort', () => {
    const sortEvent: Sort = { active: 'date', direction: 'asc' };
    const dataSource = TestBed.inject(PlanningAreasDataSource);
    component.changeSort(sortEvent);
    expect(dataSource.changeSort).toHaveBeenCalledWith(sortEvent);
  });

  it('should navigate to plan on viewPlan', () => {
    const plan = { id: 123 } as any;
    spyOn(router, 'navigate');
    component.viewPlan(plan, new MouseEvent('click'));
    expect(router.navigate).toHaveBeenCalledWith(['plan', plan.id]);
  });
});
