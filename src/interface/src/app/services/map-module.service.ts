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

  private _loadError$ = new BehaviorSubject(false);
  /** True when the last loadMapModule call failed. */
  public loadError$ = this._loadError$.asObservable();

  private lastGeometry?: any;
  private latestLoad = 0;

  public datasets$ = this.mapData$.pipe(
    map((data) => ({
      main_datasets: [...data.datasets.main_datasets].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      base_datasets: [...data.datasets.base_datasets].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      categories: data.datasets.categories ?? [],
    }))
  );

  constructor(
    private moduleService: ModuleService,
    @Inject(MAP_MODULE_NAME) private dynamicModuleName: string
  ) {}

  datasetsFor(moduleName: string, geometry?: any) {
    const filters = geometry ? { geometry } : undefined;
    return this.moduleService
      .getModule<ApiModule<MapData>>(moduleName, filters)
      .pipe(map((data) => data.options.datasets.main_datasets));
  }

  loadMapModule(geometry?: any) {
    this.lastGeometry = geometry;
    this._loadError$.next(false);
    // e.g. the app's unfiltered load landing after a plan's filtered one
    const load = ++this.latestLoad;
    const isLatest = () => load === this.latestLoad;
    const filters = geometry ? { geometry } : undefined;
    return this.moduleService
      .getModule<ApiModule<MapData>>(this.moduleName, filters)
      .pipe(
        tap({
          next: (data) => isLatest() && this._mapData$.next(data.options),
          error: () => isLatest() && this._loadError$.next(true),
        })
      );
  }

  /** Repeats the last load, with the same geometry. */
  retryLoadMapModule() {
    this.loadMapModule(this.lastGeometry).subscribe();
  }

  get moduleName(): string {
    return this.dynamicModuleName;
  }
}
