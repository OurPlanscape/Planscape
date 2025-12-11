import { Injectable } from '@angular/core';
import { ModuleService } from '@services/module.service';
import { ApiModule, MapData } from '../types/module.types';
import { BehaviorSubject, shareReplay } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class MapModuleService {
  private _mapData$ = new BehaviorSubject<MapData | null>(null);
  public mapData$ = this._mapData$.asObservable().pipe(
    filter((mapData): mapData is MapData => !!mapData),
    shareReplay(1)
  );

  constructor(private moduleService: ModuleService) {}

  loadMapModule() {
    this.moduleService
      .getModule<ApiModule<MapData>>('map')
      .subscribe((data) => this._mapData$.next(data.options));
  }
}
