import { Injectable } from '@angular/core';
import { DataLayersService, ScenarioService } from '@services';
import {
  Constraint,
  DataLayer,
  ScenarioConfig,
  ScenarioDraftConfiguration,
  ScenarioV3Config,
} from '@types';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  EMPTY,
  filter,
  map,
  mapTo,
  merge,
  Observable,
  of,
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
import { ScenarioStepConfig } from '@scenario/scenario.constants';

@Injectable()
export class NewScenarioState {
  planId = this.route.snapshot.data['planId'];

  private _scenarioConfig$ = new BehaviorSubject<Partial<ScenarioV3Config>>({});
  public scenarioConfig$ = this._scenarioConfig$.asObservable();

  // user selected excluded areas
  private _excludedAreas$ = new BehaviorSubject<number[]>([]);
  public excludedAreas$ = this._excludedAreas$.asObservable();

  // max slope and/or distance to roads constraints
  private _constraints$ = new BehaviorSubject<Constraint[]>([]);
  public constraints$ = this._constraints$.asObservable();

  private _currentStep$ = new BehaviorSubject<ScenarioStepConfig | null>(null);
  public currentStep$ = this._currentStep$.asObservable();

  // flag to track if the base stands are loaded
  private baseStandsReady$ = new BehaviorSubject(false);

  public priorityObjectivesDetails$ = this.scenarioConfig$.pipe(
    map((config: ScenarioConfig) => config.priority_objectives),
    map((ids) => (Array.isArray(ids) && ids.length > 0 ? ids : [])),
    distinctUntilChanged(
      (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
    ),
    switchMap((ids: number[]) =>
      ids.length === 0
        ? of<DataLayer[]>([])
        : this.dataLayersService.getDataLayersByIds(ids).pipe(
            map((layers) => layers ?? ([] as DataLayer[])),
            catchError((error) => {
              console.error('Error fetching data layers:', error);
              return of<DataLayer[]>([]);
            })
          )
    ),
    shareReplay(1)
  );

  public coBenefitsDetails$ = this.scenarioConfig$.pipe(
    map((config: ScenarioConfig) => config.cobenefits),
    map((ids) => (Array.isArray(ids) && ids.length > 0 ? ids : [])),
    distinctUntilChanged(
      (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
    ),
    switchMap((ids: number[]) =>
      ids.length === 0
        ? of<DataLayer[]>([])
        : this.dataLayersService.getDataLayersByIds(ids).pipe(
            map((layers) => layers ?? ([] as DataLayer[])),
            catchError((error) => {
              console.error('Error fetching data layers:', error);
              return of<DataLayer[]>([]);
            })
          )
    ),
    shareReplay(1)
  );

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
    this._currentStep$,
    this.standSize$,
    this.excludedAreas$,
    this.constraints$,
  ]).pipe(
    filter(([standsLoaded]) => !!standsLoaded),
    // only trigger/refresh on the steps that interact with the map
    filter(([_, step]) => step?.refreshAvailableStands ?? false),
    tap(() => {
      this.setLoading(false);
    }),
    tap(() => this.setLoading(true)),
    switchMap(([_, step, standSize, excludedAreas, constraints]) =>
      this.scenarioService
        .getExcludedStands(
          this.planId,
          standSize,
          step?.includeExcludedAreas ? excludedAreas : undefined,
          step?.includeConstraints ? constraints : undefined
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

  isValidToGoNext$: Observable<boolean> = this._currentStep$.pipe(
    switchMap((step) =>
      step === null
        ? of(true)
        : this.availableStands$.pipe(
            map((s) => (Math.floor(s?.summary?.treatable_area) ?? 0) > 0)
          )
    ),
    distinctUntilChanged(),
    shareReplay(1)
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

  private _draftFinished$ = new BehaviorSubject(false);

  private slopeId = 0;
  private distanceToRoadsId = 0;

  constructor(
    private scenarioService: ScenarioService,
    private route: ActivatedRoute,
    private snackbar: MatSnackBar,
    private forsysService: ForsysService,
    private dataLayersService: DataLayersService
  ) {
    this.forsysService.forsysData$.subscribe((forsys) => {
      this.slopeId = forsys.thresholds.slope.id;
      this.distanceToRoadsId = forsys.thresholds.distance_from_roads.id;
    });
  }

  setDraftFinished(isFinished: boolean) {
    this._draftFinished$.next(isFinished);
  }

  isDraftFinishedSnapshot() {
    return this._draftFinished$.value === true;
  }

  setLoading(isLoading: boolean) {
    this._loading$.next(isLoading);
  }

  setExcludedAreas(value: number[]) {
    this._excludedAreas$.next(value);
  }

  setScenarioConfig(config: Partial<ScenarioDraftConfiguration>) {
    this._scenarioConfig$.next(config);
    if (config.excluded_areas) {
      this.setExcludedAreas(config.excluded_areas);
    }
  }

  setConstraints(constraints: Constraint[]) {
    this._constraints$.next(constraints);
  }

  setCurrentStep(config: ScenarioStepConfig | null) {
    this._currentStep$.next(config);
  }

  setBaseStandsLoaded(loaded: boolean) {
    this.baseStandsReady$.next(loaded);
  }

  getSlopeId() {
    return this.slopeId;
  }

  getDistanceToRoadsId() {
    return this.distanceToRoadsId;
  }
}
