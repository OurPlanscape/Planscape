import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlanComponent } from './plan.component';
import { AuthGuard } from '@services';
import { planLoaderResolver } from '../resolvers/plan-loader.resolver';

const routes: Routes = [
  // the url `/plan/` is not being used and invalid, redirect
  {
    path: '',
    redirectTo: '/',
    pathMatch: 'full',
  },
  {
    path: ':planId',
    title: 'Plan Details',
    component: PlanComponent,
    canActivate: [AuthGuard],
    resolve: {
      planId: planLoaderResolver,
    },
    data: { showOverview: true },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlanRoutingModule {}
