import { Injectable } from '@angular/core';
import { ModuleService } from '@services/module.service';
import { ApiModule, MapData } from '../types/module.types';
import { BehaviorSubject, map, shareReplay } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class MapModuleService {
  public readonly moduleName = 'map';

  private _mapData$ = new BehaviorSubject<MapData | null>(null);
  public mapData$ = this._mapData$.asObservable().pipe(
    filter((mapData): mapData is MapData => !!mapData),
    shareReplay(1)
  );

  public datasets$ = this.mapData$.pipe(map((data) => data.datasets));

  constructor(private moduleService: ModuleService) {}

  loadMapModule() {
    this.moduleService
      .getModule<ApiModule<MapData>>(this.moduleName)
      .subscribe((data) => this._mapData$.next(data.options));
  }
}
