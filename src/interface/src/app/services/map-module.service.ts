import { Inject, Injectable } from '@angular/core';
import { ModuleService } from './module.service';
import { ApiModule, MapData } from '@types';
import { BehaviorSubject, map, shareReplay, tap } from 'rxjs';
import { filter } from 'rxjs/operators';
import { MAP_MODULE_NAME } from './map-module.token';

@Injectable({
  providedIn: 'root',
})
export class MapModuleService {
  private _mapData$ = new BehaviorSubject<MapData | null>(null);
  public mapData$ = this._mapData$.asObservable().pipe(
    filter((mapData): mapData is MapData => !!mapData),
    shareReplay(1)
  );

  public datasets$ = this.mapData$.pipe(map((data) => data.datasets));

  constructor(
    private moduleService: ModuleService,
    @Inject(MAP_MODULE_NAME) private dynamicModuleName: string
  ) {}

  loadMapModule(geometry?: any) {
    return this.moduleService
      .getModule<ApiModule<MapData>>(this.moduleName, { geometry })
      .pipe(tap((data) => this._mapData$.next(data.options)));
  }

  get moduleName(): string {
    return this.dynamicModuleName;
  }
}
