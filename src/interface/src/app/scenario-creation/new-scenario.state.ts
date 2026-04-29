import { Injectable } from '@angular/core';
import { ScenarioService } from '@services';
import {
  BaseLayer,
  Constraint,
  DataLayer,
  ScenarioConfig,
  ScenarioDraftConfiguration,
  ScenarioV3Config,
} from '@types';
import { DatalayersService } from '@api/datalayers/datalayers.service';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  EMPTY,
  filter,
  finalize,
  map,
  mapTo,
  merge,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SNACK_ERROR_CONFIG } from '@shared';
import { ForsysService } from '@services/forsys.service';
import { ScenarioStepConfig } from '@scenario/scenario.constants';

@Injectable()
export class NewScenarioState {
  scenarioId = this.route.snapshot.data['scenarioId'];

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

  private _selectedSubUnitLayer$ = new BehaviorSubject<BaseLayer | null>(null);
  public selectedSubUnitLayer$ = this._selectedSubUnitLayer$.asObservable();

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
        : this.datalayersService.datalayersList({ id__in: ids }).pipe(
            map(
              (response) =>
                (response.results ?? []) as unknown as DataLayer[]
            ),
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
        : this.datalayersService.datalayersList({ id__in: ids }).pipe(
            map(
              (response) =>
                (response.results ?? []) as unknown as DataLayer[]
            ),
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
    switchMap(([_, step, standSize, excludedAreas, constraints]) => {
      // Inside the project fn so it runs after switchMap cancels the previous inner (and its
      // finalize fires) — a tap() before switchMap would be overridden by that finalize.
      this.setLoading(true);
      return this.scenarioService
        .getExcludedStands(
          this.scenarioId,
          standSize,
          step?.includeExcludedAreas ? excludedAreas : undefined,
          step?.includeConstraints ? constraints : undefined
        )
        .pipe(
          catchError(() => {
            this.showMapError();
            return EMPTY;
          }),
          finalize(() => this.setLoading(false))
        );
    }),
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

  private readonly planId = this.route.snapshot.data['planId'];

  constructor(
    private scenarioService: ScenarioService,
    private route: ActivatedRoute,
    private router: Router,
    private snackbar: MatSnackBar,
    private forsysService: ForsysService,
    private datalayersService: DatalayersService
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

  setSelectedSubUnitLayer(layer: BaseLayer | null) {
    this._selectedSubUnitLayer$.next(layer);
  }

  get selectedSubUnitLayerId(): number | null {
    return this._selectedSubUnitLayer$.value?.id ?? null;
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

  showMapError() {
    this.snackbar.open(
      'There was a problem loading your scenario.\n Try editing your draft again or create a new scenario.',
      'Dismiss',
      {
        ...SNACK_ERROR_CONFIG,
        panelClass: ['snackbar-error', 'snackbar-error-multiline'],
      }
    );
    this.setDraftFinished(true);
    this.router.navigate(['/plan', this.planId]);
  }
}
