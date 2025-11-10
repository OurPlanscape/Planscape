import { Component } from '@angular/core';
import { ScenarioState } from 'src/app/scenario/scenario.state';
import {
  catchError,
  combineLatest,
  filter,
  map,
  Observable,
  of,
  shareReplay,
  takeWhile,
} from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AsyncPipe, NgIf } from '@angular/common';
import { ResourceUnavailableComponent } from '../../shared/resource-unavailable/resource-unavailable.component';
import { UploadedScenarioViewComponent } from '../uploaded-scenario-view/uploaded-scenario-view.component';
import { ViewScenarioComponent } from '../view-scenario/view-scenario.component';
import { ScenarioCreationComponent } from '../scenario-creation/scenario-creation.component';
import { Router } from '@angular/router';
import { AuthService } from '@services';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { CanComponentDeactivate } from '@services/can-deactivate.guard';
import { NewScenarioState } from '../new-scenario.state';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../standalone/confirmation-dialog/confirmation-dialog.component';
import { EXIT_SCENARIO_MODAL } from '../scenario.constants';
import { isScenarioPending } from '../scenario-helper';

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
  ],
  selector: 'app-scenario-route-placeholder',
  templateUrl: './scenario-route-placeholder.component.html',
  styleUrl: './scenario-route-placeholder.component.scss',
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
    private newScenarioState: NewScenarioState
  ) {}

  isDraft = false;

  canDeactivate(): Observable<boolean> | boolean {
    if (
      this.isDraft &&
      !this.newScenarioState.isDraftFinishedSnapshot()
    ) {
      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        data: EXIT_SCENARIO_MODAL,
      });
      return dialogRef.afterClosed();
    }

    return true;
  }

  // We are going to display scenario creation just if we have SCENARIO_DRAFTS FF enabled and the creator is the same as the logged in user
  canViewScenarioCreation$ = combineLatest([
    this.authService.loggedInUser$,
    this.scenarioState.currentScenario$,
  ]).pipe(
    untilDestroyed(this),
    filter(([user]) => !!user),
    map(([user, scenario]) => {
      this.isDraft = scenario?.scenario_result?.status === 'DRAFT';

      // if scenario is pending redirect the user
      if (isScenarioPending(scenario)) {
        this.router.navigate(['/plan', scenario?.planning_area]);
        return false;
      }

      // If the scenario is NOT a draft we should NOT display the creation mode
      if (!this.isDraft) {
        return false;
      }

      // If it is a draft and the creator is not the same as the user logged in we redirect to planning areas
      const sameCreator = user?.id === scenario?.user;
      if (!(sameCreator && this.isDraft)) {
        this.router.navigate(['/plan', scenario?.planning_area]);
        return false;
      }
      return sameCreator && this.isDraft;
    }),
    catchError(() => {
      this.router.navigate(['/home']);
      return of(false);
    }),
    shareReplay(1)
  );
}
