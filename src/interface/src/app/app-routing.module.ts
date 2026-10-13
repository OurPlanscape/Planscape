import { Injectable, NgModule } from '@angular/core';
import { Title } from '@angular/platform-browser';
import {
  RouterModule,
  RouterStateSnapshot,
  Routes,
  TitleStrategy,
} from '@angular/router';
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
import { TreatmentEffectsHomeComponent } from './treatments/treatment-effects-home/treatment-effects-home.component';
import { workspaceLoaderResolver } from './resolvers/workspace-loader.resolver';

const planRoutes: Routes = [
  {
    path: 'plan',

    loadChildren: () => import('@plan/plan.module').then((m) => m.PlanModule),
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
      import('@treatments/treatments.module').then((m) => m.TreatmentsModule),
  },
];

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
        canMatch: [loggedInMatchGuard],
        loadComponent: () =>
          import('@app/workspaces/workspaces.component').then(
            (m) => m.WorkspacesComponent
          ),
      },
      {
        path: 'workspace/:workspaceId',
        title: 'Workspace',
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
        // The same plan, scenario and treatment pages, reached from a workspace.
        path: 'workspace/:workspaceId',
        resolve: {
          workspaceId: workspaceLoaderResolver,
        },
        children: planRoutes,
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
      { path: 'explore', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'explore/:planId',
        redirectTo: 'map-viewer/:planId',
        pathMatch: 'full',
      },
      // Declared before `map-viewer/:planId` so `workspace` is never read as a
      // plan id. Plans will move under the workspace later.
      {
        path: 'map-viewer/workspace/:workspaceId',
        title: 'Map Viewer',
        canActivate: [AuthGuard],
        loadComponent: () =>
          import('@explore/explore/explore.component').then(
            (m) => m.ExploreComponent
          ),
        resolve: {
          planInit: planResetResolver,
          workspaceId: workspaceLoaderResolver,
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
      ...planRoutes,
      {
        path: 'funding-report/:id',
        title: 'Funding Opportunity Report',
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
