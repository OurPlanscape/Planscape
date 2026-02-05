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
  passwordResetTokenResolver,
  RedirectGuard,
  redirectResolver,
} from '@services';
import { numberResolver } from '@resolvers/number.resolver';
import {
  planLoaderResolver,
  planResetResolver,
} from '@resolvers/plan-loader.resolver';
import { scenarioLoaderResolver } from '@resolvers/scenario-loader.resolver';

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
        component: HomeComponent,
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

      {
        path: 'explore',
        title: 'Explore',
        loadComponent: () =>
          import('@explore/explore/explore.component').then(
            (m) => m.ExploreComponent
          ),
        resolve: {
          planInit: planResetResolver,
        },
      },
      {
        path: 'explore/:planId',
        title: 'Explore',
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
        path: 'feedback',
        canActivate: [RedirectGuard],
        component: RedirectGuard,
        data: {
          externalUrl:
            'https://40an0d.share-na2.hsforms.com/2KUarbZ6aSPS_1E-lzmANIw',
        },
      },
      {
        path: 'help',
        canActivate: [RedirectGuard],
        component: RedirectGuard,
        data: {
          externalUrl:
            'https://github.com/OurPlanscape/Planscape/wiki/Planscape-User-Guide',
        },
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
