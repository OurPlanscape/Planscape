import { PlanningAreasDataSource } from './planning-areas.datasource';
import { PlanService } from '@services';
import { QueryParamsService } from './query-params.service';
import { firstValueFrom, of } from 'rxjs';
import { Sort } from '@angular/material/sort';

describe('PlanningAreasDataSource', () => {
  let dataSource: PlanningAreasDataSource;
  let planServiceSpy: jasmine.SpyObj<PlanService>;
  let queryParamsServiceSpy: jasmine.SpyObj<QueryParamsService>;

  const defaultSort: Sort = { active: 'name', direction: 'asc' };
  const initialPageParams = { page: 1, limit: 10 };

  const createDataSource = () => {
    dataSource = new PlanningAreasDataSource(
      planServiceSpy,
      queryParamsServiceSpy
    );
  };

  beforeEach(() => {
    planServiceSpy = jasmine.createSpyObj<PlanService>('PlanService', [
      'getPlanPreviews',
      'getCreators',
      'deletePlan',
    ]);
    queryParamsServiceSpy = jasmine.createSpyObj<QueryParamsService>(
      'QueryParamsService',
      [
        'getInitialSortParams',
        'getInitialPageParams',
        'getInitialFilterParam',
        'getInitialCreatorsIdParam',
        'updateUrl',
      ]
    );

    queryParamsServiceSpy.getInitialSortParams.and.returnValue(defaultSort);
    queryParamsServiceSpy.getInitialPageParams.and.returnValue({
      ...initialPageParams,
    });
    queryParamsServiceSpy.getInitialFilterParam.and.returnValue('');
    queryParamsServiceSpy.getInitialCreatorsIdParam.and.returnValue([]);
    planServiceSpy.getCreators.and.returnValue(
      of([
        { id: 1, name: 'Creator 1' },
        { id: 2, name: 'Creator 2' },
      ] as any)
    );
    planServiceSpy.getPlanPreviews.and.returnValue(
      of({
        count: 0,
        results: [],
      })
    );

    createDataSource();
  });

  it('filters selected creators based on initial creator ids', async () => {
    queryParamsServiceSpy.getInitialCreatorsIdParam.and.returnValue([2]);
    createDataSource();

    const selectedCreators = await firstValueFrom(dataSource.selectedCreators$);

    expect(selectedCreators.map((creator) => creator.id)).toEqual([2]);
  });

  it('loads data, updates state, and derives pages', () => {
    planServiceSpy.getPlanPreviews.and.returnValue(
      of({
        count: 12,
        results: [{ id: 1 } as any],
      })
    );

    const loadingStates: boolean[] = [];
    const initialLoadStates: boolean[] = [];
    const dataStates: unknown[] = [];
    const pageStates: number[] = [];
    const noEntriesStates: boolean[] = [];
    const hasFiltersStates: boolean[] = [];

    dataSource.loading$.subscribe((value) => loadingStates.push(value));
    dataSource.initialLoad$.subscribe((value) => initialLoadStates.push(value));
    dataSource.connect().subscribe((value) => dataStates.push(value));
    dataSource.pages$.subscribe((value) => pageStates.push(value));
    dataSource.noEntries$.subscribe((value) => noEntriesStates.push(value));
    dataSource.hasFilters$.subscribe((value) => hasFiltersStates.push(value));

    dataSource.loadData();

    expect(planServiceSpy.getPlanPreviews).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      ordering: 'name',
    });
    expect(loadingStates).toEqual([false, true, false]);
    expect(initialLoadStates[initialLoadStates.length - 1]).toBe(false);
    expect(dataStates[dataStates.length - 1]).toEqual([{ id: 1 }]);
    expect(pageStates[pageStates.length - 1]).toBe(2);
    expect(noEntriesStates[noEntriesStates.length - 1]).toBe(false);
    expect(hasFiltersStates[hasFiltersStates.length - 1]).toBe(false);
  });

  it('emits noEntries when there are no results', () => {
    planServiceSpy.getPlanPreviews.and.returnValue(
      of({
        count: 0,
        results: [],
      })
    );

    const noEntriesStates: boolean[] = [];
    dataSource.noEntries$.subscribe((value) => noEntriesStates.push(value));

    dataSource.loadData();

    expect(noEntriesStates[noEntriesStates.length - 1]).toBe(true);
  });

  it('resets page and reloads when sorting changes', () => {
    const loadSpy = spyOn(dataSource, 'loadData').and.callThrough();
    const newSort: Sort = { active: 'date', direction: 'desc' };

    dataSource.changeSort(newSort);

    expect(dataSource.pageOptions.page).toBe(1);
    expect(queryParamsServiceSpy.updateUrl).toHaveBeenCalledWith({
      active: 'date',
      direction: 'desc',
      page: undefined,
    });
    expect(loadSpy).toHaveBeenCalled();
  });

  it('resets page and reloads when changing page size', () => {
    const loadSpy = spyOn(dataSource, 'loadData').and.callThrough();

    dataSource.changePageSize(25);

    expect(dataSource.pageOptions.page).toBe(1);
    expect(dataSource.pageOptions.limit).toBe(25);
    expect(queryParamsServiceSpy.updateUrl).toHaveBeenCalledWith({
      limit: 25,
      page: undefined,
    });
    expect(loadSpy).toHaveBeenCalled();
  });

  it('applies creator filters, updates url, and reloads data', () => {
    const loadSpy = spyOn(dataSource, 'loadData').and.callThrough();

    dataSource.filterCreator([1, 3]);

    expect(queryParamsServiceSpy.updateUrl).toHaveBeenCalledWith({
      creators: '1,3',
      page: undefined,
    });
    expect(loadSpy).toHaveBeenCalled();
  });

  it('updates page and reloads data when going to a page', () => {
    const loadSpy = spyOn(dataSource, 'loadData').and.callThrough();

    dataSource.goToPage(2);

    expect(dataSource.pageOptions.page).toBe(2);
    expect(queryParamsServiceSpy.updateUrl).toHaveBeenCalledWith({ page: 2 });
    expect(loadSpy).toHaveBeenCalled();
  });

  it('reloads data after deleting a plan', () => {
    planServiceSpy.deletePlan.and.returnValue(of(void 0));
    const loadSpy = spyOn(dataSource, 'loadData');

    dataSource.deletePlan(5).subscribe();

    expect(planServiceSpy.deletePlan).toHaveBeenCalledWith(5);
    expect(loadSpy).toHaveBeenCalled();
  });

  it('updates search term, updates url, and reloads data', () => {
    const loadSpy = spyOn(dataSource, 'loadData').and.callThrough();

    dataSource.search('timber');

    expect(dataSource.searchTerm).toBe('timber');
    expect(queryParamsServiceSpy.updateUrl).toHaveBeenCalledWith({
      name: 'timber',
      page: undefined,
    });
    expect(loadSpy).toHaveBeenCalled();
  });
});
