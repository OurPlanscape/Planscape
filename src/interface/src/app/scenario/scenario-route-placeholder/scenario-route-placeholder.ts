import { Component } from '@angular/core';
import { ScenarioState } from '../scenario.state';
import {
  catchError,
  combineLatest,
  filter,
  map,
  Observable,
  of,
  shareReplay,
  take,
  takeWhile,
} from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AsyncPipe, NgIf } from '@angular/common';
import { ResourceUnavailableComponent } from '@shared/resource-unavailable/resource-unavailable.component';
import { UploadedScenarioViewComponent } from '@scenario/uploaded-scenario-view/uploaded-scenario-view.component';
import { ViewScenarioComponent } from '@scenario/view-scenario/view-scenario.component';
import { ScenarioCreationComponent } from '@scenario-creation/scenario-creation.component';
import { Router } from '@angular/router';
import { AuthService } from '@services';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { CanComponentDeactivate } from '@services/can-deactivate.guard';
import { NewScenarioState } from '@scenario-creation/new-scenario.state';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '@standalone/confirmation-dialog/confirmation-dialog.component';
import { exitModalData } from '../scenario.constants';
import { isScenarioPending } from '../scenario-helper';
import { ScenarioComponent } from '../scenario.component';
import { canEditScenario } from '@app/plan/permissions';
import { PlanState } from '@app/plan/plan.state';

@UntilDestroy()
@Component({
  standalone: true,
  imports: [
    NgIf,
    ResourceUnavailableComponent,
    AsyncPipe,
    MatProgressSpinnerModule,
    UploadedScenarioViewComponent,
    ScenarioCreationComponent,
    ViewScenarioComponent,
    ScenarioComponent,
  ],
  selector: 'app-scenario-route-placeholder',
  templateUrl: './scenario-route-placeholder.component.html',
  styleUrl: './scenario-route-placeholder.component.scss',
  providers: [NewScenarioState],
})
export class ScenarioRoutePlaceholderComponent
  implements CanComponentDeactivate
{
  currentScenarioResource$ = this.scenarioState.currentScenarioResource$.pipe(
    // complete this stream after the resource is loaded.
    takeWhile((resource) => resource.isLoading, true)
  );

  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private scenarioState: ScenarioState,
    private newScenarioState: NewScenarioState,
    private planState: PlanState
  ) {}

  isDraft = false;
  scenarioName = '';
  currentPlan$ = this.planState.currentPlan$;

  canDeactivate(): Observable<boolean> | boolean {
    if (this.isDraft && !this.newScenarioState.isDraftFinishedSnapshot()) {
      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        data: exitModalData(this.scenarioName),
      });
      return dialogRef.afterClosed().pipe(
        take(1),
        // false we stay, true we leave, black is white, night is day
        map((result) => !result)
      );
    }
    return true;
  }

  canViewScenarioCreation$ = combineLatest([
    this.authService.loggedInUser$,
    this.scenarioState.currentScenario$,
    this.planState.currentPlan$,
  ]).pipe(
    untilDestroyed(this),
    filter(([user]) => !!user),
    map(([user, scenario, plan]) => {
      this.isDraft = scenario?.scenario_result?.status === 'DRAFT';
      this.scenarioName = scenario.name;

      // if scenario is pending redirect the user
      if (isScenarioPending(scenario)) {
        this.router.navigate(['/plan', scenario?.planning_area]);
        return false;
      }

      // If the scenario is NOT a draft we should NOT display the creation mode
      if (!this.isDraft) {
        return false;
      }
      if (!user) {
        return;
      }

      // If it is a draft and the creator is not the same as the user logged in we redirect to planning areas
      const sameCreator = user?.id === scenario?.user;
      if (!(sameCreator && this.isDraft) && !canEditScenario(plan, user)) {
        this.router.navigate(['/plan', scenario?.planning_area]);
        return false;
      }
      return (sameCreator && this.isDraft) || canEditScenario(plan, user);
    }),
    catchError(() => {
      this.router.navigate(['/home']);
      return of(false);
    }),
    shareReplay(1)
  );
}
