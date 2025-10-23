import { Component } from '@angular/core';
import { ScenarioState } from 'src/app/scenario/scenario.state';
import {
  catchError,
  combineLatest,
  filter,
  map,
  of,
  shareReplay,
  take,
  takeWhile,
} from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AsyncPipe, NgIf } from '@angular/common';
import { ResourceUnavailableComponent } from '../../shared/resource-unavailable/resource-unavailable.component';
import { UploadedScenarioViewComponent } from '../uploaded-scenario-view/uploaded-scenario-view.component';
import { ViewScenarioComponent } from '../view-scenario/view-scenario.component';
import { ScenarioCreationComponent } from '../scenario-creation/scenario-creation.component';
import { FeatureService } from 'src/app/features/feature.service';
import { Router } from '@angular/router';
import { AuthService } from '@services';
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
export class ScenarioRoutePlaceholderComponent {
  currentScenarioResource$ = this.scenarioState.currentScenarioResource$.pipe(
    // complete this stream after the resource is loaded.
    takeWhile((resource) => resource.isLoading, true)
  );

  constructor(
    private authService: AuthService,
    private router: Router,
    private scenarioState: ScenarioState,
    private featureService: FeatureService
  ) {}

  // We are going to display scenario creation just if we have SCENARIO_DRAFTS FF enabled and the creator is the same as the logged in user
  canViewScenarioCreation$ = combineLatest([
    this.authService.loggedInUser$,
    this.scenarioState.currentScenario$,
  ]).pipe(
    filter(([user]) => !!user),
    take(1),
    map(([user, scenario]) => {
      const scenarioDraftsEnabled =
        this.featureService.isFeatureEnabled('SCENARIO_DRAFTS');
      const isDraft = scenario?.scenario_result?.status === 'DRAFT';

      // If SCENARIO_DRAFTS is disabled and the scenario is not a draft we return false
      if (!scenarioDraftsEnabled) {
        return false;
      }

      // If SCENARIO_DRAFTS is disabled and the scenario is a DRAFT we redirect to planning areas
      if (!scenarioDraftsEnabled && isDraft) {
        this.router.navigate(['/plan', scenario?.planning_area]);
        return false;
      }

      // If the scenario is NOT a draft we should NOT display the creation mode
      if (!isDraft) {
        return false;
      }

      // If it is a draft and the creator is not the same as the user logged in we redirect to planning areas
      const sameCreator = user?.id === scenario?.user;
      if (!(sameCreator && isDraft)) {
        this.router.navigate(['/plan', scenario?.planning_area]);
        return false;
      }
      return sameCreator && isDraft;
    }),
    catchError(() => {
      this.router.navigate(['/home']);
      return of(false);
    }),
    shareReplay(1)
  );
}
