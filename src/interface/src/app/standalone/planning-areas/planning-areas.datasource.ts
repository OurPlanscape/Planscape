import { PreviewPlan } from '@types';
import { BehaviorSubject, combineLatest, map, Observable, tap } from 'rxjs';
import { PlanService } from '@services';
import { DataSource } from '@angular/cdk/collections';
import { Sort } from '@angular/material/sort';
import { QueryParamsService } from './query-params.service';

export class PlanningAreasDataSource extends DataSource<PreviewPlan> {
  private _dataStream = new BehaviorSubject<PreviewPlan[]>([]);
  private _loading = new BehaviorSubject(false);
  private _hasFilters$ = new BehaviorSubject(false);
  private _initialLoad$ = new BehaviorSubject(true);
  private _pages$ = new BehaviorSubject(0);

  public sortOptions: Sort = this.queryParamsService.getInitialSortParams();
  public pageOptions = this.queryParamsService.getInitialPageParams();
  public searchTerm = this.queryParamsService.getInitialFilterParam();
  public limit = this.queryParamsService.getInitialLimit();

  public pages$ = this._pages$.asObservable();
  /**
   * Emits `true` if loading the first time or applying filters (where number of results change)
   * `false` when done loading.
   */
  public initialLoad$ = this._initialLoad$.asObservable();

  /**
   * Emits `true` if loading data. Includes sorting or changing pages.
   * `false` when done loading.
   */
  public loading$ = this._loading.asObservable();

  /**
   * Emits `true` if there are no results after loading data.
   */
  public noEntries$ = combineLatest([
    this.initialLoad$,
    this._dataStream.asObservable(),
  ]).pipe(
    map(([initialLoad, results]) => !initialLoad && results.length === 0)
  );

  /**
   * Emits `true` if applying filters or searching
   */
  public hasFilters$ = this._hasFilters$.asObservable();

  constructor(
    private planService: PlanService,
    private queryParamsService: QueryParamsService
  ) {
    super();
  }

  connect(): Observable<PreviewPlan[]> {
    return this._dataStream.asObservable();
  }

  /**
   * this method is required by `DataSource`, however its triggered when
   * we emit an empty array (no results) on _dataStream, which is not what we want.
   * Instead, manually call `destroy` to clean up.
   */
  disconnect() {}

  /**
   * cleanups subscriptions.
   */
  destroy() {
    this._dataStream.complete();
    this._loading.complete();
  }

  loadData() {
    const params = {
      ...this.getPageOptions(),
      ...this.getSortOptions(),
      ...this.searchOptions(),
    };
    // update filter status when loading data
    this._hasFilters$.next(!!this.searchTerm);
    this._loading.next(true);
    this.planService.getPlanPreviews(params).subscribe((data) => {
      this.setPages(data.count);
      this.setData(data.results);
      this._loading.next(false);
      this._initialLoad$.next(false);
    });
  }

  setData(data: PreviewPlan[]) {
    this._dataStream.next(data);
  }

  setPages(count: number) {
    this._pages$.next(Math.ceil(count / this.limit));
  }

  changePageSize(size: number) {
    this.limit = size;
    this.resetPage();
    this.loadData();
  }

  changeSort(sortOptions: Sort) {
    this.sortOptions = sortOptions;
    this.resetPage();
    this.loadData();
  }

  goToPage(page: number) {
    this.pageOptions.offset = (page - 1) * this.limit;
    const offset =
      this.pageOptions.offset > 0 ? this.pageOptions.offset : undefined;
    this.queryParamsService.updateUrl({
      offset: offset,
    });
    this.loadData();
  }

  deletePlan(planId: number) {
    return this.planService.deletePlan([String(planId)]).pipe(
      tap(() => {
        // reload data
        this.loadData();
      })
    );
  }

  search(str: string) {
    this._initialLoad$.next(true);
    this.searchTerm = str;
    this.queryParamsService.updateUrl({
      name: this.searchTerm ? this.searchTerm : undefined,
      offset: undefined,
    });
    this.loadData();
  }

  private resetPage() {
    this.pageOptions.offset = 0;
    this.queryParamsService.updateUrl({
      ...this.sortOptions,
      offset: undefined,
    });
  }

  private getSortOptions() {
    return {
      ordering:
        this.sortOptions.direction === 'desc'
          ? '-' + this.sortOptions.active
          : this.sortOptions.active,
    };
  }

  private getPageOptions() {
    return {
      limit: this.limit,
      offset: this.pageOptions.offset,
    };
  }

  private searchOptions() {
    if (!this.searchTerm) {
      return {};
    }
    return {
      name: this.searchTerm,
    };
  }
}
