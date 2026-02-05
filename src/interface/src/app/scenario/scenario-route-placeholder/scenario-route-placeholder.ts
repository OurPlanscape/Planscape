import { Component } from '@angular/core';
import { ScenarioState } from '@app/scenario/scenario.state';
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
import { UploadedScenarioViewComponent } from '@app/scenario/uploaded-scenario-view/uploaded-scenario-view.component';
import { ViewScenarioComponent } from '@app/scenario/view-scenario/view-scenario.component';
import { ScenarioCreationComponent } from '@app/scenario-creation/scenario-creation.component';
import { Router } from '@angular/router';
import { AuthService } from '@services';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { CanComponentDeactivate } from '@services/can-deactivate.guard';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '@app/standalone/confirmation-dialog/confirmation-dialog.component';
import { exitModalData } from '@app/scenario/scenario.constants';
import { isScenarioPending } from '@app/scenario/scenario-helper';
import { ScenarioComponent } from '@app/scenario/scenario.component';

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
    private newScenarioState: NewScenarioState
  ) {}

  isDraft = false;
  scenarioName = '';

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
  ]).pipe(
    untilDestroyed(this),
    filter(([user]) => !!user),
    map(([user, scenario]) => {
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
