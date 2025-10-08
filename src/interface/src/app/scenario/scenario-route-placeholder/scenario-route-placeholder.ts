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

  canViewDraft$ = !this.featureService.isFeatureEnabled('SCENARIO_DRAFTS')
    ? of(true)
    : combineLatest([
        this.authService.loggedInUser$,
        this.scenarioState.currentScenario$,
      ]).pipe(
        filter(([user, scenario]) => !!user && !!scenario),
        take(1),
        map(([user, scenario]) => {
          const sameCreator = user?.id === scenario.user;
          const isDraft = scenario.scenario_result?.status === 'DRAFT';
          if (!(sameCreator && isDraft)) {
            this.router.navigate(['/plan', scenario.planning_area]);
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
