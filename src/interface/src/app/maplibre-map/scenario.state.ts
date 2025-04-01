import { inject, Injectable } from '@angular/core';
import { ScenarioService } from '@services';
import { LoadedResult, Resource, Scenario } from '@types';
import {
  BehaviorSubject,
  catchError,
  concat,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScenarioState {
  private scenarioService: ScenarioService = inject(ScenarioService);

  // The ID of the current scenario
  private _currentScenarioId$ = new BehaviorSubject<number | null>(null);

  // Listen to ID changes and trigger network calls, returning typed results.
  currentScenarioResource$: Observable<Resource<Scenario>> =
    this._currentScenarioId$.pipe(
      // we might need to tweak this for reloading scenarios / etc.
      distinctUntilChanged(),
      filter((id): id is number => !!id),
      switchMap((id) => {
        return concat(
          // when loading emit object with loading
          of({ isLoading: true }),
          this.scenarioService.getScenario(id.toString()).pipe(
            // when done, emit object with loading false and data
            map(
              (data) => ({ data, isLoading: false }) as LoadedResult<Scenario>
            ),
            // when we have errors, emit object with loading false and error
            catchError((error) => of({ isLoading: false, error: error }))
          )
        );
      }),
      // ensure each new subscriber gets the cached result immediately without re-fetching
      shareReplay(1)
    );

  /**
   * This observable filter currentScenarioResource$ to only emit when we have a scenario,
   * and we are not loading.
   */
  public currentScenario$ = this.currentScenarioResource$.pipe(
    filter((d): d is LoadedResult<Scenario> => !d.isLoading && !!d.data),
    map((d) => d.data)
  );

  /**
   * Observable that maps only to loading status.
   */
  public isScenarioLoading$ = this.currentScenarioResource$.pipe(
    map((d) => d.isLoading)
  );

  setScenarioId(id: number) {
    this._currentScenarioId$.next(id);
  }
}
