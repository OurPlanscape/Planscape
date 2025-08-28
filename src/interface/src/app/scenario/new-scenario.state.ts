import { inject, Injectable } from '@angular/core';
import { ScenarioService } from '@services';
import { Constraint, NamedConstraint, ScenarioCreation } from '@types';
import {
  BehaviorSubject,
  combineLatest,
  filter,
  map,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import { DataLayersService } from '@services/data-layers.service';

@Injectable({
  providedIn: 'root',
})
export class NewScenarioState {
  private scenarioService: ScenarioService = inject(ScenarioService);

  // todo set this via injection token once we split plan and scenario components
  public planId = 0;

  private _scenarioConfig$ = new BehaviorSubject<Partial<ScenarioCreation>>({});
  public scenarioConfig$ = this._scenarioConfig$.asObservable();

  // user selected excluded areas
  private _excludedAreas$ = new BehaviorSubject<number[]>([]);
  public excludedAreas$ = this._excludedAreas$.asObservable();

  // max slope and/or distance to roads constraints
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

  public slopeId = 0;
  public distanceToRoadsId = 0;

  constructor(private dataLayersService: DataLayersService) {
    this.dataLayersService.getMaxSlopeLayerId().subscribe((s) => {
      this.slopeId = s;
    });
    this.dataLayersService.getDistanceToRoadsLayerId().subscribe((s) => {
      this.distanceToRoadsId = s;
    });
  }

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

  // TODO - remove and use setConstraints when we implement dynamic constraints
  setNamedConstraints(namedConstraints: NamedConstraint[]) {
    const constraints: Constraint[] = namedConstraints.map((c) => {
      const datalayer =
        c.name === 'maxSlope' ? this.slopeId : this.distanceToRoadsId;
      return {
        datalayer: datalayer,
        value: c.value,
        operator: c.operator,
      };
    });
    this.setConstraints(constraints);
  }

  reset() {
    this._scenarioConfig$.next({});
    this._excludedAreas$.next([]);
    this._constraints$.next([]);
    this.setPlanId(0);
  }
}
