import { inject, Injectable } from '@angular/core';
import { ScenarioService } from '@services';
import { AvailableStands, ScenarioCreation } from '@types';
import {
  BehaviorSubject,
  combineLatest,
  filter,
  map,
  shareReplay,
  Subject,
  switchMap,
  tap,
} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NewScenarioState {
  private scenarioService: ScenarioService = inject(ScenarioService);

  // todo set this better
  public planId = 0;

  private _scenarioConfig$ = new BehaviorSubject<Partial<ScenarioCreation>>({});
  public scenarioConfig$ = this._scenarioConfig$.asObservable();

  private _excludedStands$ = new Subject<AvailableStands>();
  public excludedStands$ = this._excludedStands$
    .asObservable()
    .pipe(shareReplay(1));

  public excludedAreas$ = new BehaviorSubject<number[]>([]);

  private standSize$ = this.scenarioConfig$.pipe(
    filter((config) => !!config.stand_size),
    map((c) => c.stand_size!)
  );
  public availableStands$ = combineLatest([
    this.standSize$,
    this.excludedAreas$,
  ]).pipe(
    tap(() => this.setLoading(true)),
    switchMap(([standSize, excludedAreas]) =>
      this.scenarioService.getExcludedStands(
        this.planId,
        standSize,
        excludedAreas
      )
    ),
    tap(() => this.setLoading(false))
  );

  private _loading$ = new BehaviorSubject(false);
  public loading$ = this._loading$.asObservable();

  constructor() {}

  setLoading(isLoading: boolean) {
    this._loading$.next(isLoading);
  }

  setPlanId(val: number) {
    this.planId = val;
  }

  setExcludedAreas(value: number[]) {
    this.excludedAreas$.next(value);
  }

  setScenarioConfig(config: Partial<ScenarioCreation>) {
    this._scenarioConfig$.next(config);
  }
}
