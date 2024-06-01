import { PreviewPlan } from '@types';
import { BehaviorSubject, map, Observable, Subject } from 'rxjs';
import { PlanService } from '@services';
import { DataSource } from '@angular/cdk/collections';
import { Sort } from '@angular/material/sort';
import { QueryParamsService } from './query-params.service';

export class PlanningAreasDataSource extends DataSource<PreviewPlan> {
  // TODO pagination, just setting limit for now.
  private pageOptions = {
    limit: 13,
    offset: 0,
  };

  private _dataStream = new Subject<PreviewPlan[]>();
  private _loading = new BehaviorSubject(false);
  public loading$ = this._loading.asObservable();

  public initialLoad = new BehaviorSubject(true);

  public sortOptions: Sort = this.queryParamsService.getInitialSortParams();

  public noEntries = this._dataStream.pipe(
    map((results) => results.length === 0)
  );

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
    this._dataStream.complete(); // Complete the data stream
  }

  loadData() {
    const params = { ...this.getPageOptions(), ...this.getSortOptions() };
    this._loading.next(true);
    this.planService.getPlanPreviews(params).subscribe((data) => {
      this.setData(data);
      this._loading.next(false);
      this.initialLoad.next(false);
    });
  }

  setData(data: PreviewPlan[]) {
    this._dataStream.next(data);
    this._loading.complete();
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

  private getPageOptions() {
    return {
      limit: this.pageOptions.limit,
      offset: this.pageOptions.offset,
    };
  }
}
