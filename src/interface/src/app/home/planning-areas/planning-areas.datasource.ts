import { PreviewPlan } from '@types';
import { BehaviorSubject, map, Observable, Subject } from 'rxjs';
import { PlanService } from '@services';
import { DataSource } from '@angular/cdk/collections';
import { Sort } from '@angular/material/sort';

export class PlanningAreasDataSource extends DataSource<PreviewPlan> {
  // TODO pagination, just setting limit for now.
  readonly limit = 15;
  offset = 0;
  private _dataStream = new Subject<PreviewPlan[]>();
  private _loading = new BehaviorSubject(false);
  public loading$ = this._loading.asObservable();

  public initialLoad = new BehaviorSubject(true);

  public sortOptions: Sort = { active: 'name', direction: 'asc' };

  public noEntries = this._dataStream.pipe(map((d) => d.length === 0));

  constructor(private planService: PlanService) {
    super();
  }

  connect(): Observable<PreviewPlan[]> {
    console.log('connect');
    return this._dataStream.asObservable();
  }

  loadData() {
    this._loading.next(true);
    this.planService
      .getPlanPreviews(this.getSortOptions())
      .subscribe((data) => {
        this.setData(data);
        this._loading.next(false);
        this.initialLoad.next(false);
      });
  }

  disconnect() {
    this._dataStream.complete(); // Complete the data stream
  }

  setData(data: PreviewPlan[]) {
    this._dataStream.next(data);
  }

  changeSort(sortOptions: Sort) {
    this.sortOptions = sortOptions;
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
}
