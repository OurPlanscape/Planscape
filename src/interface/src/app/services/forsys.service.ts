import { Injectable } from '@angular/core';
import { BehaviorSubject, map, shareReplay } from 'rxjs';
import { ModuleService } from '@services/module.service';
import { ApiModule, ForsysData } from '../types/module.types';
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

  constructor(private moduleService: ModuleService) { }

  loadForsysData() {
    this.moduleService
      .getModule<ApiModule<ForsysData>>('forsys')
      .subscribe((data) => {
        console.log('do ew have fosys data?:', data);
        this._forsysData$.next(data.options);
        // Bogus data if we don't have layers in the DB:
        const staticTestData = {
          "options": {
            "inclusions": [],
            "exclusions": [
              {
                "id": 4209,
                "name": "Protection Status 1 - Managed for biodiversity - disturbances events proceed or mimicked (e.g., wilderness)"
              },
              {
                "id": 4210,
                "name": "Protection Status 2 - Managed for biodiversity - disturbance events suppressed (e.g., national wildlife refuge)"
              },
              {
                "id": 4211,
                "name": "Protection Status 3 - Managed for multiple uses but subject to extractive uses such as logging and mining (e.g., national forest)"
              }
            ],
            "thresholds": {
              "slope": {
                "id": 4203,
                "name": "CONUS Slope Percentage"
              },
              "distance_from_roads": {
                "id": 4202,
                "name": "Distance from Roads - Yards"
              }
            }
          }

        };
        this._forsysData$.next(staticTestData.options);
      }
      );
  }
}
