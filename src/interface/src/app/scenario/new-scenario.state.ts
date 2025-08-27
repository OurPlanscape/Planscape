import { inject, Injectable } from '@angular/core';
import { ScenarioService } from '@services';
import { Constraint, ScenarioCreation } from '@types';
import {
  BehaviorSubject,
  combineLatest,
  filter,
  map,
  shareReplay,
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

  private _excludedAreas$ = new BehaviorSubject<number[]>([]);
  public excludedAreas$ = this._excludedAreas$.asObservable();

  private _constraints$ = new BehaviorSubject<Constraint[]>([]);
  public constraints$ = this._constraints$.asObservable();

  private standSize$ = this.scenarioConfig$.pipe(
    filter((config) => !!config.stand_size),
    map((c) => c.stand_size!)
  );
  public availableStands$ = combineLatest([
    this.standSize$,
    this.excludedAreas$,
    this.constraints$,
  ]).pipe(
    tap(() => this.setLoading(true)),
    switchMap(([standSize, excludedAreas, constraints]) =>
      this.scenarioService.getExcludedStands(
        this.planId,
        standSize,
        excludedAreas,
        constraints
      )
    ),
    tap(() => this.setLoading(false)),
    shareReplay(1)
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
    this._excludedAreas$.next(value);
  }

  setScenarioConfig(config: Partial<ScenarioCreation>) {
    this._scenarioConfig$.next(config);
  }

  setConstraints(constraints: Constraint[]) {
    this._constraints$.next(constraints);
  }
}
