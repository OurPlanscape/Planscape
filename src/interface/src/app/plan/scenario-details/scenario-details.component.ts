import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  catchError,
  filter,
  map,
  Observable,
  of,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs';
import { PlanService } from 'src/app/services';
import {
  colorTransitionTrigger,
  expandCollapsePanelTrigger,
  opacityTransitionTrigger,
} from 'src/app/shared/animations';
import { Scenario } from 'src/app/types';

@Component({
  selector: 'app-scenario-details',
  templateUrl: './scenario-details.component.html',
  styleUrls: ['./scenario-details.component.scss'],
  animations: [
    expandCollapsePanelTrigger,
    colorTransitionTrigger({
      triggerName: 'expandCollapseButton',
      colorA: 'white',
      colorB: '#ebebeb',
      timingA: '300ms ease-out',
      timingB: '250ms ease-out',
    }),
    opacityTransitionTrigger({
      triggerName: 'expandCollapsePanelContent',
      timingA: '100ms ease-out',
      timingB: '100ms 250ms ease-out',
    }),
  ],
})
export class ScenarioDetailsComponent implements OnInit {
  scenarioId: string | null = null;
  scenario$?: Observable<Scenario | null>;
  panelExpanded: boolean = true;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private matSnackBar: MatSnackBar,
    private planService: PlanService
  ) {}

  ngOnInit(): void {
    this.scenario$ = this.getScenario();
    this.scenario$.subscribe((scenario) => {
      console.log(scenario);
    });
  }

  private getScenario() {
    return this.planService.planState$.pipe(
      tap((state) => {
        this.panelExpanded = state.panelExpanded ?? false;
      }),
      map((state) => state.currentScenarioId),
      filter((scenarioId) => !!scenarioId),
      switchMap((scenarioId) => {
        return this.planService.getScenario(scenarioId as string).pipe(take(1));
      }),
      catchError(() => {
        this.matSnackBar.open('[Error] Scenario not found!', 'Dismiss', {
          duration: 10000,
          panelClass: ['snackbar-error'],
          verticalPosition: 'top',
        });
        return of(null);
      }),
      takeUntil(this.destroy$)
    );
  }
}
