import { PreviewPlan } from '@types';
import { BehaviorSubject, combineLatest, map, Observable, tap } from 'rxjs';
import { PlanService } from '@services';
import { DataSource } from '@angular/cdk/collections';
import { Sort } from '@angular/material/sort';
import { QueryParams, QueryParamsService } from './query-params.service';

export class PlanningAreasDataSource extends DataSource<PreviewPlan> {
  private _dataStream = new BehaviorSubject<PreviewPlan[]>([]);
  private _loading = new BehaviorSubject(false);
  private _hasFilters$ = new BehaviorSubject(false);
  private _initialLoad$ = new BehaviorSubject(true);
  private _pages$ = new BehaviorSubject(0);

  public sortOptions: Sort = this.queryParamsService.getInitialSortParams();
  public pageOptions = this.queryParamsService.getInitialPageParams();
  public searchTerm = this.queryParamsService.getInitialFilterParam();

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

  changeSort(sortOptions: Sort) {
    this.sortOptions = sortOptions;
    this.resetPageAndUpdateUrl(this.sortOptions);
    this.loadData();
  }

  changePageSize(size: number) {
    this.pageOptions.limit = size;
    this.resetPageAndUpdateUrl({ limit: size });
    this.loadData();
  }

  goToPage(page: number) {
    this.pageOptions.page = page;
    this.queryParamsService.updateUrl({
      // if we are on page 1, omit the page parameter
      page: page > 1 ? page : undefined,
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
    this.resetPageAndUpdateUrl({
      name: this.searchTerm ? this.searchTerm : undefined,
    });
    this.loadData();
  }

  private resetPageAndUpdateUrl(options?: QueryParams) {
    this.pageOptions.page = 1;
    this.queryParamsService.updateUrl({
      ...options,
      page: undefined,
    });
  }

  private setData(data: PreviewPlan[]) {
    this._dataStream.next(data);
  }

  private setPages(count: number) {
    this._pages$.next(Math.ceil(count / this.pageOptions.limit));
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
      limit: this.pageOptions.limit,
      offset: (this.pageOptions.page - 1) * this.pageOptions.limit,
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
