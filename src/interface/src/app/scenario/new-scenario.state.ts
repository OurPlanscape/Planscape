import { inject, Injectable } from '@angular/core';
import { ScenarioService } from '@services';
import { Constraint, NamedConstraint, ScenarioCreation } from '@types';
import {
  BehaviorSubject,
  combineLatest,
  filter,
  map,
  mapTo,
  merge,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { FeatureService } from '../features/feature.service';
import { distinctUntilChanged } from 'rxjs/operators';
import { ModuleService } from '@services/module.service';

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

  // flag to track if the base stands are loaded
  public baseStandsReady$ = new BehaviorSubject(false);

  // helper to get standSize from `scenarioConfig$`
  private standSize$ = this.scenarioConfig$.pipe(
    filter((config) => !!config.stand_size),
    map((c) => c.stand_size!),
    distinctUntilChanged()
  );

  // trigger to get available stands
  private _baseStandsLoaded$ = merge(
    this.standSize$.pipe(mapTo(false)), // flip to false on size change
    this.baseStandsReady$.asObservable() // flip to true when loading completes
  ).pipe(startWith(false), shareReplay({ bufferSize: 1, refCount: true }));

  public availableStands$ = combineLatest([
    this._baseStandsLoaded$,
    this.standSize$,
    this.excludedAreas$,
    this.constraints$,
  ]).pipe(
    filter(([standsLoaded]) => !!standsLoaded),
    tap(() => this.setLoading(true)),
    switchMap(([standsLoaded, standSize, excludedAreas, constraints]) =>
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

  public excludedStands = this.availableStands$.pipe(
    map((c) => c.unavailable.by_exclusions)
  );

  public constraintStands$ = this.availableStands$.pipe(
    map((c) => c.unavailable.by_thresholds)
  );

  hasExcludedStands$ = this.excludedStands.pipe(
    map((stands) => stands.length > 0)
  );

  hasConstrainedStands$ = this.constraintStands$.pipe(
    map((stands) => stands.length > 0)
  );

  private _loading$ = new BehaviorSubject(false);
  public loading$ = this._loading$.asObservable();

  private slopeId = 0;
  private distanceToRoadsId = 0;

  private _stepIndex$ = new BehaviorSubject(0);
  public stepIndex$ = this._stepIndex$.asObservable();

  constructor(
    private moduleService: ModuleService,
    private featureService: FeatureService
  ) {
    if (this.featureService.isFeatureEnabled('DYNAMIC_SCENARIO_MAP')) {
      this.moduleService.getForsysModule().subscribe((forsys) => {
        this.slopeId = forsys.options.thresholds.slope.id;
        this.distanceToRoadsId =
          forsys.options.thresholds.distance_from_roads.id;
      });
    }
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

  setStepIndex(i: number) {
    this._stepIndex$.next(i);
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

  setBaseStandsLoaded(loaded: boolean) {
    this.baseStandsReady$.next(loaded);
  }

  reset() {
    this._scenarioConfig$.next({});
    this._excludedAreas$.next([]);
    this._constraints$.next([]);
    this.baseStandsReady$.next(false);
    this.setPlanId(0);
    this.setLoading(false);
  }
}
