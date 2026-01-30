import { inject, Injectable } from '@angular/core';
import { DataLayersService, ScenarioService } from '@services';
import {
  AvailableStands,
  DataLayer,
  LoadedResult,
  Resource,
  Scenario,
  ScenarioHydrated,
} from '@types';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  concat,
  filter,
  map,
  Observable,
  of,
  shareReplay,
  Subject,
  switchMap,
} from 'rxjs';
import { isCustomScenario } from './scenario-helper';

@Injectable({
  providedIn: 'root',
})
export class ScenarioState {
  private scenarioService: ScenarioService = inject(ScenarioService);
  private dataLayersService: DataLayersService = inject(DataLayersService);

  // The ID of the current scenario
  private _currentScenarioId$ = new BehaviorSubject<number | null>(null);
  public currentScenarioId$ = this._currentScenarioId$.asObservable();

  // BehaviorSubject that we are going to use to manually reload the scenario
  private _reloadScenario$ = new BehaviorSubject<void>(undefined);

  private _excludedStands$ = new Subject<AvailableStands>();
  public excludedStands$ = this._excludedStands$
    .asObservable()
    .pipe(shareReplay(1));

  // Listen to ID changes and trigger network calls, returning typed results.
  currentScenarioResource$: Observable<Resource<ScenarioHydrated>> =
    combineLatest([
      this._currentScenarioId$.pipe(filter((id): id is number => !!id)),
      this._reloadScenario$,
    ]).pipe(
      switchMap(([id]) =>
        concat(
          // when loading emit object with loading
          of({ isLoading: true }),
          this.scenarioService.getScenario(id).pipe(
            //if custom scenario load more data, hydrate by loading data layers
            switchMap((scenario) => this.hydrateScenario$(scenario)),
            // when done, emit object with loading false and data
            map(
              (data) =>
                ({ data, isLoading: false }) as LoadedResult<ScenarioHydrated>
            ),
            // when we have errors, emit object with loading false and error
            catchError((error) => of({ isLoading: false, error }))
          )
        )
      ),
      // ensure each new subscriber gets the cached result immediately without re-fetching
      shareReplay(1)
    );

  /**
   * Flag to turn on or off the visibility of the config overlay
   */
  private _displayConfigOverlay$ = new BehaviorSubject<boolean>(false);
  public displayConfigOverlay$ = this._displayConfigOverlay$.asObservable();

  /**
   * This observable filter currentScenarioResource$ to only emit when we have a scenario,
   * and we are not loading.
   * Use this when you know you should have a scenario. If you might not have a scenario check scenarioId$ first
   */
  public currentScenario$ = this.currentScenarioResource$.pipe(
    filter(
      (d): d is LoadedResult<ScenarioHydrated> => !d.isLoading && !!d.data
    ),
    map((d) => d.data)
  );

  /**
   * Observable that maps only to loading status.
   */
  public isScenarioLoading$ = this.currentScenarioResource$.pipe(
    map((d) => d.isLoading)
  );

  public isScenarioSuccessful$ = this.currentScenarioId$.pipe(
    switchMap((id) => {
      if (!id) {
        return of(false);
      }
      return this.currentScenario$.pipe(
        map((plan) => plan.scenario_result?.status === 'SUCCESS')
      );
    })
  );

  setScenarioId(id: number) {
    this._currentScenarioId$.next(id);
  }

  resetScenarioId(): void {
    this._currentScenarioId$.next(null);
  }

  // Reload the current scenario manually
  reloadScenario() {
    this._reloadScenario$.next();
  }

  setDisplayOverlay(display: boolean) {
    this._displayConfigOverlay$.next(display);
  }

  private hydrateScenario$(scenario: Scenario): Observable<ScenarioHydrated> {
    if (!isCustomScenario(scenario.type)) {
      return of(scenario as ScenarioHydrated);
    }

    const priorityIds = scenario.configuration?.priority_objectives ?? [];
    const cobenefitIds = scenario.configuration?.cobenefits ?? [];
    const allIds = uniqueNumbers([...priorityIds, ...cobenefitIds]);

    if (allIds.length === 0) {
      return of(this.applyHydration(scenario, new Map()));
    }

    return this.dataLayersService.getDataLayersByIds(allIds).pipe(
      map((layers) => {
        const byId = new Map(layers.map((l) => [l.id, l] as const));
        return this.applyHydration(scenario, byId);
      })
    );
  }

  private applyHydration(
    scenario: Scenario,
    byId: Map<number, DataLayer>
  ): ScenarioHydrated {
    const priorityIds = scenario.configuration?.priority_objectives ?? [];
    const cobenefitIds = scenario.configuration?.cobenefits ?? [];

    const hydrate = (ids: number[]) =>
      ids.map((id) => byId.get(id)).filter((x): x is DataLayer => !!x);

    return {
      ...scenario,
      priority_objectives: hydrate(priorityIds),
      cobenefits: hydrate(cobenefitIds),
    };
  }
}

function uniqueNumbers(ids: number[]): number[] {
  return Array.from(new Set(ids));
}
