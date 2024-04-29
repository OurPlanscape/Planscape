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
import { PasswordResetComponent } from './password-reset/password-reset.component';
import { AuthGuard } from './services';
import { passwordResetTokenResolver } from './services/password-reset.resolver';
import { SignupComponent } from './signup/signup.component';
import { RedirectGuard } from './services/redirect.guard';
import { AccountValidationComponent } from './account-validation/account-validation.component';
import { ExploreComponent } from './plan/explore/explore/explore.component';
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
        path: 'explore/:id',
        title: 'Explore Plan',
        component: ExploreComponent,
        canActivate: [AuthGuard],
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
        path: 'plan',
        loadChildren: () =>
          import('./plan/plan.module').then((m) => m.PlanModule),
      },
      {
        path: 'account',
        loadChildren: () =>
          import('./account/account.module').then((m) => m.AccountModule),
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
