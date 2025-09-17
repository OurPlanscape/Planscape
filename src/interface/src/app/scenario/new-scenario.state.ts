import { Injectable } from '@angular/core';
import { ScenarioService } from '@services';
import { Constraint, NamedConstraint, ScenarioCreation } from '@types';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  EMPTY,
  filter,
  map,
  mapTo,
  merge,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SNACK_ERROR_CONFIG } from '@shared';
import { ForsysService } from '@services/forsys.service';

@Injectable()
export class NewScenarioState {
  planId = this.route.snapshot.data['planId'];

  private _scenarioConfig$ = new BehaviorSubject<Partial<ScenarioCreation>>({});
  public scenarioConfig$ = this._scenarioConfig$.asObservable();

  // user selected excluded areas
  private _excludedAreas$ = new BehaviorSubject<number[]>([]);
  public excludedAreas$ = this._excludedAreas$.asObservable();

  // max slope and/or distance to roads constraints
  private _constraints$ = new BehaviorSubject<Constraint[]>([]);
  public constraints$ = this._constraints$.asObservable();

  private _stepIndex$ = new BehaviorSubject(0);
  public stepIndex$ = this._stepIndex$.asObservable();

  // flag to track if the base stands are loaded
  private baseStandsReady$ = new BehaviorSubject(false);

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
  ).pipe(
    startWith(false),
    shareReplay({ bufferSize: 1, refCount: true }),
    distinctUntilChanged()
  );

  public availableStands$ = combineLatest([
    this._baseStandsLoaded$,
    this.stepIndex$,
    this.standSize$,
    this.excludedAreas$,
    this.constraints$,
  ]).pipe(
    filter(([standsLoaded]) => !!standsLoaded),
    // only trigger/refresh on the steps that interact with the map
    filter(([standsLoaded, stepIndex]) => stepIndex < 3),
    tap(() => this.setLoading(true)),
    switchMap(([_, step, standSize, excludedAreas, constraints]) =>
      this.scenarioService
        .getExcludedStands(
          this.planId,
          standSize,
          step > 0 ? excludedAreas : undefined,
          step > 1 ? constraints : undefined
        )
        .pipe(
          tap(() => this.setLoading(false)),
          catchError(() => {
            this.snackbar.open(
              '[Error] Cannot load map data',
              'Dismiss',
              SNACK_ERROR_CONFIG
            );
            this.setLoading(false);
            return EMPTY;
          })
        )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  public excludedStands$ = this.availableStands$.pipe(
    map((c) => c.unavailable.by_exclusions)
  );

  public constraintStands$ = this.availableStands$.pipe(
    map((c) => c.unavailable.by_thresholds)
  );

  hasExcludedStands$ = this.excludedStands$.pipe(
    map((stands) => stands.length > 0)
  );

  hasConstrainedStands$ = this.constraintStands$.pipe(
    map((stands) => stands.length > 0)
  );

  public doesNotMeetConstraintsStands$ = this.availableStands$.pipe(
    map((c) => c.unavailable.by_thresholds)
  );

  private _loading$ = new BehaviorSubject(false);
  public loading$ = this._loading$.asObservable();

  private slopeId = 0;
  private distanceToRoadsId = 0;

  constructor(
    private scenarioService: ScenarioService,
    private route: ActivatedRoute,
    private snackbar: MatSnackBar,
    private forsysService: ForsysService
  ) {
    this.forsysService.forsysData$.subscribe((forsys) => {
      this.slopeId = forsys.thresholds.slope.id;
      this.distanceToRoadsId = forsys.thresholds.distance_from_roads.id;
    });
  }

  setLoading(isLoading: boolean) {
    this._loading$.next(isLoading);
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
}
