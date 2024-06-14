import { PreviewPlan } from '@types';
import { BehaviorSubject, map, Observable, Subject, tap } from 'rxjs';
import { PlanService } from '@services';
import { DataSource } from '@angular/cdk/collections';
import { Sort } from '@angular/material/sort';
import { QueryParamsService } from './query-params.service';

export class PlanningAreasDataSource extends DataSource<PreviewPlan> {
  private readonly limit = 13;

  private _dataStream = new Subject<PreviewPlan[]>();
  private _loading = new BehaviorSubject(false);

  public count = 0;
  public pages = 0;

  public loading$ = this._loading.asObservable();
  public initialLoad$ = new BehaviorSubject(true);
  public noEntries$ = this._dataStream.pipe(
    map((results) => results.length === 0)
  );

  public sortOptions: Sort = this.queryParamsService.getInitialSortParams();

  public pageOptions = this.queryParamsService.getInitialPageParams();

  private searchTerm = '';

  constructor(
    private planService: PlanService,
    private queryParamsService: QueryParamsService
  ) {
    super();
  }

  connect(): Observable<PreviewPlan[]> {
    return this._dataStream.asObservable();
  }

  disconnect() {
    this._dataStream.complete();
    this._loading.complete();
  }

  loadData() {
    const params = {
      ...this.getPageOptions(),
      ...this.getSortOptions(),
      ...this.searchOptions(),
    };
    this._loading.next(true);
    this.planService.getPlanPreviews(params).subscribe((data) => {
      this.setPages(data.count);
      this.setData(data.results);
      this._loading.next(false);
      this.initialLoad$.next(false);
    });
  }

  setData(data: PreviewPlan[]) {
    this._dataStream.next(data);
  }

  setPages(count: number) {
    this.count = count;
    this.pages = Math.ceil(count / 13);
  }

  changeSort(sortOptions: Sort) {
    this.pageOptions.offset = 0;
    this.sortOptions = sortOptions;
    this.queryParamsService.updateUrl({ ...sortOptions, offset: undefined });
    this.loadData();
  }

  goToPage(page: number) {
    this.pageOptions.offset = (page - 1) * this.limit;
    const offset =
      this.pageOptions.offset > 0 ? this.pageOptions.offset : undefined;
    this.queryParamsService.updateUrl({
      ...this.sortOptions,
      offset: offset,
    });
    this.loadData();
  }

  private getSortOptions() {
    return {
      ordering:
        this.sortOptions.direction === 'desc'
          ? '-' + this.sortOptions.active
          : this.sortOptions.active,
    };
  }

  /**
   * transforms page options to limit/offset.
   * @private
   */
  private getPageOptions() {
    return {
      limit: this.limit,
      offset: this.pageOptions.offset,
    };
  }

  private searchOptions() {
    return {
      name: this.searchTerm,
    };
  }

  deletePlan(planId: number) {
    return this.planService.deletePlan([String(planId)]).pipe(
      tap(() => {
        // reload data
        this.loadData();
      })
    );
  }

  public search(str: string) {
    this.searchTerm = str;
    this.loadData();
  }
}
