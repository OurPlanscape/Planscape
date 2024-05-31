import { PreviewPlan } from '@types';
import { Observable, Subject } from 'rxjs';
import { PlanService } from '@services';
import { DataSource } from '@angular/cdk/collections';
import { Sort } from '@angular/material/sort';

export class PlanningAreasDataSource extends DataSource<PreviewPlan> {
  readonly limit = 15;
  offset = 0;
  private _dataStream = new Subject<PreviewPlan[]>();

  constructor(
    private planService: PlanService,
    private sortOptions: Sort
  ) {
    super();
  }

  connect(): Observable<PreviewPlan[]> {
    this.loadData();
    return this._dataStream.asObservable();
  }

  loadData() {
    console.log('load data ');
    this.planService.getPlanPreviews(this.sortOptions).subscribe((data) => {
      console.log('setting data');
      this.setData(data);
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
    console.log('change sort');
    this.loadData();
  }
}
