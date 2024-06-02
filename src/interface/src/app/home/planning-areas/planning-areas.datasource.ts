import { PreviewPlan } from '@types';
import { BehaviorSubject, map, Observable, Subject } from 'rxjs';
import { PlanService } from '@services';
import { DataSource } from '@angular/cdk/collections';
import { Sort } from '@angular/material/sort';
import { QueryParamsService } from './query-params.service';

export class PlanningAreasDataSource extends DataSource<PreviewPlan> {
  private _dataStream = new Subject<PreviewPlan[]>();
  private _loading = new BehaviorSubject(false);

  private count = 0;

  public loading$ = this._loading.asObservable();
  public initialLoad$ = new BehaviorSubject(true);
  public noEntries$ = this._dataStream.pipe(
    map((results) => results.length === 0)
  );

  public sortOptions: Sort = this.queryParamsService.getInitialSortParams();
  // TODO pagination, just setting limit for now.
  public pageOptions = this.queryParamsService.getInitialPageParams();

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
    const params = { ...this.getPageOptions(), ...this.getSortOptions() };
    this._loading.next(true);
    this.planService.getPlanPreviews(params).subscribe((data) => {
      this.count = data.count;
      this.setData(data.results);
      this._loading.next(false);
      this.initialLoad$.next(false);
    });
  }

  setData(data: PreviewPlan[]) {
    this._dataStream.next(data);
  }

  changeSort(sortOptions: Sort) {
    this.sortOptions = sortOptions;
    this.queryParamsService.changeSort(sortOptions);
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
   * need to change backend to use pages instead of limitoffsetpagination
   * https://www.django-rest-framework.org/api-guide/pagination/
   * @private
   */
  private getPageOptions() {
    console.log(this.count);
    return {
      limit: this.pageOptions.limit,
      offset: this.pageOptions.offset,
    };
  }
}
