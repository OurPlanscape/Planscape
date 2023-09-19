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
import { Plan, ProjectArea, Scenario } from 'src/app/types';

// TODO Confirm if this page is still needed and delete if not
// If it is still needed, improve how scenarioId is retrieved
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
  plan$: Observable<Plan | null> = of(null);
  scenario$?: Observable<Scenario | null>;
  panelExpanded: boolean = true;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private matSnackBar: MatSnackBar,
    private planService: PlanService
  ) {}

  ngOnInit(): void {
    this.scenario$ = this.getScenario();
    this.plan$ = this.getPlan();

    this.scenario$
      .pipe(
        map((scenario) => {
          return scenario?.configuration?.projectAreas;
        }),
        take(1)
      )
      .subscribe((projectAreas) => {
        if (projectAreas) {
          this.drawProjectAreas(projectAreas);
        }
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
        return this.planService.getScenario(scenarioId!).pipe(take(1));
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

  private getPlan() {
    return this.planService.planState$.pipe(
      map((state) => {
        if (state.currentPlanId) {
          return state.all[state.currentPlanId];
        } else {
          return null;
        }
      }),
      takeUntil(this.destroy$)
    );
  }

  changeCondition(layer: string): void {
    this.planService.updateStateWithConditionLayer(layer);
  }

  togglePanelExpand(): void {
    this.panelExpanded = !this.panelExpanded;
    this.planService.updateStateWithPanelState(this.panelExpanded);
  }

  private drawProjectAreas(projectAreas: ProjectArea[]): void {
    const areas: any[] = [];
    projectAreas.forEach((projectArea) => {
      areas.push(projectArea.projectArea);
    });
    this.planService.updateStateWithShapes(areas);
  }
}
