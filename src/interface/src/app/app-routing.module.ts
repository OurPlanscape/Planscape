import { Injectable, NgModule } from '@angular/core';
import { Title } from '@angular/platform-browser';
import {
  RouterModule,
  RouterStateSnapshot,
  Routes,
  TitleStrategy,
} from '@angular/router';
import { HomeComponent } from '@home/home.component';
import {
  AuthGuard,
  DevelopmentRouteGuard,
  loggedInMatchGuard,
  loggedOutMatchGuard,
  passwordResetTokenResolver,
  RedirectGuard,
  redirectResolver,
} from '@services';
import {
  planLoaderResolver,
  planResetResolver,
} from '@resolvers/plan-loader.resolver';
import { scenarioLoaderResolver } from '@resolvers/scenario-loader.resolver';
import { numberResolver } from './resolvers/number.resolver';
import {
  createFeatureGuard,
  createFeatureMatchGuard,
} from '@app/features/feature.guard';
import { TreatmentEffectsHomeComponent } from './treatments/treatment-effects-home/treatment-effects-home.component';
import { workspaceLoaderResolver } from './resolvers/workspace-loader.resolver';

const routes: Routes = [
  {
    path: '',
    title: 'Planscape',
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'login',
        title: 'Login',
        loadComponent: () =>
          import('@standalone/login/login.component').then(
            (m) => m.LoginComponent
          ),
      },
      {
        path: 'reset/:userId/:token',
        title: 'Password reset',
        resolve: { passwordResetToken: passwordResetTokenResolver },
        loadComponent: () =>
          import('@standalone/password-reset/password-reset.component').then(
            (m) => m.PasswordResetComponent
          ),
      },
      {
        path: 'reset',
        title: 'Forget password',
        loadComponent: () =>
          import('@standalone/forget-password/forget-password.component').then(
            (m) => m.ForgetPasswordComponent
          ),
      },
      // `home` renders one of three components, first match wins:
      // logged out -> welcome, logged in -> home, logged in + flag -> workspaces
      {
        path: 'home',
        title: 'Home',
        canMatch: [loggedOutMatchGuard],
        loadComponent: () =>
          import('@home/welcome/welcome.component').then(
            (m) => m.WelcomeComponent
          ),
      },
      {
        path: 'home',
        title: 'Home',
        canMatch: [loggedInMatchGuard, createFeatureMatchGuard('WORKSPACES')],
        loadComponent: () =>
          import('@app/workspaces/workspaces.component').then(
            (m) => m.WorkspacesComponent
          ),
      },
      {
        path: 'home',
        title: 'Home',
        component: HomeComponent,
      },
      {
        path: 'workspace/:workspaceId',
        title: 'Workspace',
        canMatch: [createFeatureMatchGuard('WORKSPACES')],
        canActivate: [AuthGuard],
        resolve: {
          workspaceId: workspaceLoaderResolver,
        },
        loadComponent: () =>
          import(
            '@app/workspaces/workspace-dashboard/workspace-dashboard.component'
          ).then((m) => m.WorkspaceDashboardComponent),
      },
      {
        path: 'signup',
        title: 'Signup',
        resolve: { redirectUrl: redirectResolver },
        loadComponent: () =>
          import('@standalone/signup/signup.component').then(
            (m) => m.SignupComponent
          ),
      },
      {
        path: 'thankyou',
        title: 'Thank You',
        loadComponent: () =>
          import('@standalone/thank-you/thank-you.component').then(
            (m) => m.ThankYouComponent
          ),
      },
      {
        path: 'sentrytest',
        title: 'Testing Sentry',
        canActivate: [DevelopmentRouteGuard],
        loadComponent: () =>
          import(
            '@standalone/sentry-error-test/sentry-error-test.component'
          ).then((m) => m.SentryErrorTestComponent),
      },
      {
        path: 'validate/:token',
        title: 'Account E-mail Validation',
        loadComponent: () =>
          import(
            '@standalone/account-validation/account-validation.component'
          ).then((m) => m.AccountValidationComponent),
      },

      // Keep explore redirect but remove eventually
      { path: 'explore', redirectTo: 'map-viewer', pathMatch: 'full' },
      {
        path: 'explore/:planId',
        redirectTo: 'map-viewer/:planId',
        pathMatch: 'full',
      },
      {
        path: 'map-viewer',
        title: 'Map Viewer',
        // With workspaces the map viewer belongs to a workspace, so a bare
        // `map-viewer` has nothing to show: send them to pick one on `home`.
        // A `canMatch` + `redirectTo` route can't do this, the router applies
        // the redirect without ever running the guard.
        canActivate: [
          createFeatureGuard({
            featureName: 'WORKSPACES',
            inverted: true,
            fallback: '/home',
          }),
        ],
        loadComponent: () =>
          import('@explore/explore/explore.component').then(
            (m) => m.ExploreComponent
          ),
        resolve: {
          planInit: planResetResolver,
        },
      },
      // Declared before `map-viewer/:planId` so `workspace` is never read as a
      // plan id. Plans will move under the workspace later.
      {
        path: 'map-viewer/workspace/:workspaceId',
        title: 'Map Viewer',
        canMatch: [createFeatureMatchGuard('WORKSPACES')],
        canActivate: [AuthGuard],
        loadComponent: () =>
          import('@explore/explore/explore.component').then(
            (m) => m.ExploreComponent
          ),
        resolve: {
          planInit: planResetResolver,
        },
      },
      {
        path: 'map-viewer/:planId',
        title: 'Map Viewer',
        loadComponent: () =>
          import('@explore/explore/explore.component').then(
            (m) => m.ExploreComponent
          ),

        resolve: {
          planInit: planLoaderResolver,
        },
        canActivate: [AuthGuard],
      },
      {
        path: 'map-viewer/:planId/:scenarioId',
        title: 'Map Viewer',
        loadComponent: () =>
          import('@explore/explore/explore.component').then(
            (m) => m.ExploreComponent
          ),
        resolve: {
          planInit: planLoaderResolver,
          scenarioId: scenarioLoaderResolver,
        },
        canActivate: [AuthGuard],
      },
      {
        path: 'forsys',
        canActivate: [RedirectGuard],
        component: RedirectGuard,
        data: {
          externalUrl: 'https://www.forsysplanning.org/',
        },
      },
      {
        path: 'plan',

        loadChildren: () =>
          import('@plan/plan.module').then((m) => m.PlanModule),
      },
      {
        path: 'plan/:planId/scenario',
        resolve: {
          planId: planLoaderResolver,
        },

        loadChildren: () =>
          import('@scenario/scenario.module').then((m) => m.ScenarioModule),
      },
      {
        path: 'plan/:planId/scenario/:scenarioId/treatment',
        pathMatch: 'full',
        canActivate: [AuthGuard],
        resolve: {
          planInit: planLoaderResolver,
          scenarioInit: scenarioLoaderResolver,
        },
        component: TreatmentEffectsHomeComponent,
      },
      {
        // follow the route structure of plan, but without nesting modules and components
        path: 'plan/:planId/scenario/:scenarioId/treatment/:treatmentId',
        canActivate: [AuthGuard],
        resolve: {
          planInit: planLoaderResolver,
          treatmentId: numberResolver('treatmentId', ''),
          scenarioInit: scenarioLoaderResolver,
        },
        loadChildren: () =>
          import('@treatments/treatments.module').then(
            (m) => m.TreatmentsModule
          ),
      },
      {
        path: 'funding-report/:id',
        title: 'Funding Opportunity Report',
        canActivate: [
          createFeatureGuard({ featureName: 'SHARE_FUNDING_REPORTS' }),
        ],
        loadComponent: () =>
          import('@app/funding/for-shared/for-shared.component').then(
            (m) => m.ForSharedComponent
          ),
      },
      {
        path: 'account',
        loadChildren: () =>
          import('@account/account.module').then((m) => m.AccountModule),
      },
      { path: '**', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class PlanscapeTitleStrategy extends TitleStrategy {
  constructor(private readonly title: Title) {
    super();
  }

  override updateTitle(routerState: RouterStateSnapshot) {
    const title = this.buildTitle(routerState);
    if (title !== undefined) {
      this.title.setTitle(`Planscape | ${title}`);
    }
  }
}

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [
    {
      provide: TitleStrategy,
      useClass: PlanscapeTitleStrategy,
    },
  ],
})
export class AppRoutingModule {}
