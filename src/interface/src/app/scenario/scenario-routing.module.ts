import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { resetDatalayerResolver } from '@app/resolvers/reset-datalayer.resolver';
import { ScenarioRoutePlaceholderComponent } from '@app/scenario/scenario-route-placeholder/scenario-route-placeholder';
import { scenarioLoaderResolver } from '@app/resolvers/scenario-loader.resolver';
import { ScenarioComponent } from '@app/scenario/scenario.component';
import { canDeactivateGuard } from '@services/can-deactivate.guard';

const routes: Routes = [
  {
    path: '',
    component: ScenarioComponent,
    title: 'Scenario Configuration',
    children: [
      {
        // for this path, we use scenarioLoaderResolver to force redirect to /plan/:planId
        path: '',
        component: ScenarioComponent,
        resolve: {
          scenarioId: scenarioLoaderResolver,
        },
      },
    ],
  },
  {
    path: ':scenarioId',
    component: ScenarioRoutePlaceholderComponent,
    title: 'Scenario Configuration',
    canDeactivate: [canDeactivateGuard],
    resolve: {
      scenarioId: scenarioLoaderResolver,
      dataLayerInit: resetDatalayerResolver,
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ScenarioRoutingModule {}
