import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlanComponent } from './plan.component';
import { AuthGuard } from '@services';
import { CreateScenariosComponent } from './create-scenarios/create-scenarios.component';
import { ExploreComponent } from './explore/explore/explore.component';
import { ScenarioRoutePlaceholderComponent } from './scenario-route-placeholder/scenario-route-placeholder';
import { planLoaderResolver } from '../resolvers/plan-loader.resolver';
import { scenarioLoaderResolver } from '../resolvers/scenario-loader.resolver';

const routes: Routes = [
  {
    path: ':id',
    title: 'Plan Details',
    component: PlanComponent,
    canActivate: [AuthGuard],
    resolve: {
      planInit: planLoaderResolver,
    },
    data: { showOverview: true },
    children: [
      {
        path: 'config/',
        title: 'Scenario Configuration',
        component: CreateScenariosComponent,
        data: { showOverview: false },
      },
      {
        path: 'config/:id',
        title: 'Scenario Configuration',
        component: ScenarioRoutePlaceholderComponent,
        resolve: {
          scenarioInit: scenarioLoaderResolver,
        },
        data: { showOverview: false },
      },
      {
        path: 'explore',
        title: 'Explore',
        component: ExploreComponent,
        data: { showOverview: false },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlanRoutingModule {}
