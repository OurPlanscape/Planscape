import { Injectable } from '@angular/core';
import { BehaviorSubject, map, shareReplay } from 'rxjs';
import { ModuleService } from '@services/module.service';
import { ApiModule, ForsysData } from '@types';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ForsysService {
  private _forsysData$ = new BehaviorSubject<ForsysData | null>(null);
  public forsysData$ = this._forsysData$.asObservable().pipe(
    filter((forsysData): forsysData is ForsysData => !!forsysData),
    shareReplay(1)
  );

  public excludedAreas$ = this.forsysData$.pipe(map((data) => data.exclusions));

  constructor(private moduleService: ModuleService) {}

  loadForsysData() {
    this.moduleService
      .getModule<ApiModule<ForsysData>>('forsys')
      .subscribe((data) => this._forsysData$.next(data.options));
  }
}
