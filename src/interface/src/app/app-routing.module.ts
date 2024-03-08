import { Injectable, NgModule } from '@angular/core';
import { Title } from '@angular/platform-browser';
import {
  RouterModule,
  RouterStateSnapshot,
  Routes,
  TitleStrategy,
} from '@angular/router';

import { ForgetPasswordComponent } from './forget-password/forget-password.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { MapComponent } from './map/map.component';
import { CreateScenariosComponent } from './plan/create-scenarios/create-scenarios.component';
import { PlanComponent } from './plan/plan.component';
import { PasswordResetComponent } from './password-reset/password-reset.component';
import { AuthGuard } from './services';
import { passwordResetTokenResolver } from './services/password-reset.resolver';
import { SignupComponent } from './signup/signup.component';
import { RedirectGuard } from './services/redirect.guard';
import { AccountValidationComponent } from './account-validation/account-validation.component';
import { ExploreComponent } from './plan/explore/explore/explore.component';
import { AccountPageComponent } from './account/account-page/account-page.component';
import { DetailsComponent } from './account/details/details.component';
import { CredentialsComponent } from './account/credentials/credentials.component';
import { DeleteAccountComponent } from './account/delete-account/delete-account.component';
import { ThankYouComponent } from './signup/thank-you/thank-you.component';
import { redirectResolver } from './services/redirect.resolver';

const routes: Routes = [
  {
    path: '',
    title: 'Planscape',
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'login',
        title: 'Login',
        component: LoginComponent,
      },
      {
        path: 'reset/:userId/:token',
        title: 'Password reset',
        resolve: { passwordResetToken: passwordResetTokenResolver },
        component: PasswordResetComponent,
      },
      {
        path: 'reset',
        title: 'Forget password',
        component: ForgetPasswordComponent,
      },
      {
        path: 'home',
        title: 'Home',
        component: HomeComponent,
      },
      {
        path: 'signup',
        title: 'Signup',
        component: SignupComponent,
        resolve: { redirectUrl: redirectResolver },
      },
      {
        path: 'thankyou',
        title: 'Thank You',
        component: ThankYouComponent,
      },
      {
        path: 'validate/:token',
        title: 'Account E-mail Validation',
        component: AccountValidationComponent,
      },
      {
        path: 'map',
        title: 'Explore',
        component: MapComponent,
      },
      {
        path: 'feedback',
        canActivate: [RedirectGuard],
        component: RedirectGuard,
        data: {
          externalUrl: 'https://share.hsforms.com/1xXehW6VrR0WskbHhqxsrrw3atqe',
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
        path: 'plan/:id',
        title: 'Plan Details',
        component: PlanComponent,
        canActivate: [AuthGuard],
        children: [
          {
            path: 'config',
            title: 'Scenario Configuration',
            component: CreateScenariosComponent,
          },
          {
            path: 'config/:id',
            title: 'Scenario Configuration',
            component: CreateScenariosComponent,
          },
          {
            path: 'explore',
            title: 'Explore',
            component: ExploreComponent,
          },
        ],
      },
      {
        path: 'explore/:id',
        title: 'Explore Plan',
        component: ExploreComponent,
        canActivate: [AuthGuard],
      },
      {
        path: 'account',
        title: 'Account Details',
        component: AccountPageComponent,
        canActivate: [AuthGuard],
        children: [
          {
            path: '',
            redirectTo: 'information',
            pathMatch: 'full',
          },
          {
            path: 'information',
            title: 'Edit Personal information',
            component: DetailsComponent,
          },
          {
            path: 'credentials',
            title: 'Edit Credentials',
            component: CredentialsComponent,
          },
          {
            path: 'delete-account',
            title: 'Deactivate Account',
            component: DeleteAccountComponent,
          },
        ],
      },
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
