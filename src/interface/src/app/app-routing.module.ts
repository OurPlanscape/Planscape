import { Injectable, NgModule } from '@angular/core';
import { Title } from '@angular/platform-browser';
import {
  RouterModule,
  RouterStateSnapshot,
  Routes,
  TitleStrategy,
} from '@angular/router';

import { createFeatureGuard } from './features/feature.guard';
import { ForgetPasswordComponent } from './forget-password/forget-password.component'
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { MapComponent } from './map/map.component';
import { CreateScenariosComponent } from './plan/create-scenarios/create-scenarios.component';
import { PlanComponent } from './plan/plan.component';

import { ScenarioDetailsComponent } from './plan/scenario-details/scenario-details.component';
import { AuthGuard, ValidationResolver } from './services';
import { SignupComponent } from './signup/signup.component';
import { RedirectGuard } from './redirect.guard';

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
        canActivate: [createFeatureGuard('login')],
      },
      {
        path: 'reset',
        title: 'Forget password',
        component: ForgetPasswordComponent,
        canActivate: [createFeatureGuard('login')],
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
        canActivate: [createFeatureGuard('login')],
      },
      {
        path: 'validate/:id',
        resolve: { validated: ValidationResolver },
        component: LoginComponent,
        canActivate: [createFeatureGuard('login')],
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
            path: `scenario/:id`,
            title: 'Saved Scenario Details',
            component: ScenarioDetailsComponent,
          },
          {
            path: 'config/:id',
            title: 'Scenario Configuration',
            component: CreateScenariosComponent,
          },
        ],
      },
      { path: '**', redirectTo: 'home' },
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
