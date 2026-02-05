import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlanComponent } from './plan.component';
import { AuthGuard } from '@services';
import { planLoaderResolver } from '@resolvers/plan-loader.resolver';
import { createFeatureGuard } from '@features/feature.guard';

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
  {
    path: ':planId/climate-foresight',
    title: 'Climate Foresight',
    loadComponent: () =>
      import('@plan/climate-foresight/climate-foresight.component').then(
        (m) => m.ClimateForesightComponent
      ),
    canActivate: [
      createFeatureGuard({ featureName: 'CLIMATE_FORESIGHT' }),
      AuthGuard,
    ],
    resolve: {
      planId: planLoaderResolver,
    },
  },
  {
    path: ':planId/climate-foresight/run/:runId',
    title: 'Climate Foresight Run',
    loadComponent: () =>
      import(
        '@plan/climate-foresight/climate-foresight-run/climate-foresight-run.component'
      ).then((m) => m.ClimateForesightRunComponent),
    canActivate: [
      createFeatureGuard({ featureName: 'CLIMATE_FORESIGHT' }),
      AuthGuard,
    ],
    resolve: {
      planId: planLoaderResolver,
    },
  },
  {
    path: ':planId/climate-foresight/run/:runId/analysis',
    title: 'Climate Foresight Analysis',
    loadComponent: () =>
      import(
        '@plan/climate-foresight/climate-foresight-run/analysis/analysis.component'
      ).then((m) => m.AnalysisComponent),
    canActivate: [
      createFeatureGuard({ featureName: 'CLIMATE_FORESIGHT' }),
      AuthGuard,
    ],
    resolve: {
      planId: planLoaderResolver,
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlanRoutingModule {}
