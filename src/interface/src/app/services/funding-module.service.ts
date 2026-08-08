import { Injectable } from '@angular/core';
import { BehaviorSubject, map, shareReplay, tap } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ModuleService } from './module.service';
import { ApiModule, FundingReportModuleData } from '@types';

/**
 * Loads the `funding_report` module and exposes its data layers grouped by the
 * report sections they belong to. Mirrors {@link MapModuleService}: a single
 * fetch feeds a replayed subject the rest of the funding UI reads from.
 */
@Injectable({
  providedIn: 'root',
})
export class FundingModuleService {
  private _fundingData$ = new BehaviorSubject<FundingReportModuleData | null>(
    null
  );
  public fundingData$ = this._fundingData$.asObservable().pipe(
    filter((data): data is FundingReportModuleData => !!data),
    shareReplay(1)
  );

  public datalayers$ = this.fundingData$.pipe(map((data) => data.datalayers));

  constructor(private moduleService: ModuleService) {}

  loadFundingModule() {
    return this.moduleService
      .getModule<ApiModule<FundingReportModuleData>>('funding_report')
      .pipe(tap((data) => this._fundingData$.next(data.options)));
  }
}
