import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlanComponent } from './plan.component';
import { AuthGuard } from '@services';
import { CreateScenariosComponent } from './create-scenarios/create-scenarios.component';
import { ExploreComponent } from './explore/explore/explore.component';
import { ScenarioRoutePlaceholderComponent } from './scenario-route-placeholder/scenario-route-placeholder';

const routes: Routes = [
  {
    path: ':id',
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
        component: ScenarioRoutePlaceholderComponent,
      },
      {
        path: 'explore',
        title: 'Explore',
        component: ExploreComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlanRoutingModule {}
